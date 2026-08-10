import React,{useCallback,useEffect,useState}from'react';
import{Linking,RefreshControl,Text,View}from'react-native';
import{useAuth}from'../AuthContext';
import{Badge,Button,Card,Empty,Header,Input,Loading,Screen}from'../ui';
import{C}from'../theme';

export default function MapScreenWeb(){
  const{api}=useAuth();
  const[data,setData]=useState<any[]>([]);
  const[search,setSearch]=useState('');
  const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try{const result:any=await api('/api/clientes/mapa');setData(result.data||result.clientes||[])}catch{setData([])}finally{setLoading(false)}},[api]);
  useEffect(()=>{load()},[load]);
  const filtered=data.filter(item=>!search||`${item.nombre||item.nombres||''} ${item.dni||''} ${item.distrito||''}`.toLowerCase().includes(search.toLowerCase()));
  return <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/> }>
    <Header title="Mapa" subtitle={`${data.length} clientes ubicados`}/>
    <Card><Text style={{fontSize:15,color:C.muted,lineHeight:22}}>La visualización cartográfica interactiva está disponible en Android. Desde el navegador puedes consultar las ubicaciones y abrirlas en Google Maps.</Text></Card>
    <Input value={search} onChangeText={setSearch} placeholder="Buscar cliente, DNI o distrito..."/>
    {loading?<Loading/>:filtered.length?filtered.map((item:any,index)=><Card key={item.id_cliente||item.id||index}>
      <View style={{gap:7}}><Text style={{fontSize:16,fontWeight:'900',color:C.text}}>{item.nombre||item.nombres||`Cliente #${item.id_cliente||item.id}`}</Text><Text style={{color:C.muted}}>DNI {item.dni||'No registrado'} · {item.distrito||'Distrito no registrado'}</Text><Badge status={item.estado_gestion||item.estado}/>{item.latitud&&item.longitud?<Button title="Abrir en Google Maps" kind="ghost" onPress={()=>Linking.openURL(`https://www.google.com/maps?q=${item.latitud},${item.longitud}`)}/>:null}</View>
    </Card>):<Empty title="No hay clientes ubicados"/>}
  </Screen>
}
