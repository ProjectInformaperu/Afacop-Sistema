import React,{createContext,useContext,useEffect,useMemo,useState}from'react';
import{Platform}from'react-native';
import*as SecureStore from'expo-secure-store';
import{request}from'./api';
type User={id?:string;username:string;rol:string;nombres?:string};type AuthValue={token:string|null;user:User|null;loading:boolean;login:(u:string,p:string)=>Promise<any>;verifyMfa:(c:string,n:string,e?:boolean)=>Promise<void>;logout:()=>Promise<void>;api:<T>(p:string,o?:RequestInit)=>Promise<T>};
const Context=createContext<AuthValue|null>(null);
const tokenStore={
  get:async()=>Platform.OS==='web'?globalThis.localStorage?.getItem('radar_token')||null:SecureStore.getItemAsync('radar_token'),
  set:async(value:string)=>{if(Platform.OS==='web')globalThis.localStorage?.setItem('radar_token',value);else await SecureStore.setItemAsync('radar_token',value)},
  remove:async()=>{if(Platform.OS==='web')globalThis.localStorage?.removeItem('radar_token');else await SecureStore.deleteItemAsync('radar_token')}
};
export function AuthProvider({children}:{children:React.ReactNode}){const[token,setToken]=useState<string|null>(null),[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);const complete=async(d:any)=>{setToken(d.token);setUser(d.user);await tokenStore.set(d.token)};useEffect(()=>{(async()=>{try{const saved=await tokenStore.get();if(!saved)return;const d:any=await request('/api/auth/me',{},saved);setToken(saved);setUser(d.user)}catch{await tokenStore.remove()}finally{setLoading(false)}})()},[]);const value=useMemo<AuthValue>(()=>({token,user,loading,login:async(username,password)=>{const d:any=await request('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});if(!d.mfaRequired&&!d.mfaEnrollmentRequired)await complete(d);return d},verifyMfa:async(challengeToken,code,enroll=false)=>{const d:any=await request(enroll?'/api/auth/mfa/enroll/confirm':'/api/auth/mfa/verify',{method:'POST',body:JSON.stringify({challengeToken,code})});await complete(d)},logout:async()=>{try{if(token)await request('/api/auth/logout',{method:'POST'},token)}catch{}setToken(null);setUser(null);await tokenStore.remove()},api:<T,>(p:string,o:RequestInit={})=>request<T>(p,o,token)}),[token,user,loading]);return<Context.Provider value={value}>{children}</Context.Provider>}
export const useAuth=()=>{const c=useContext(Context);if(!c)throw new Error('AuthProvider requerido');return c};
