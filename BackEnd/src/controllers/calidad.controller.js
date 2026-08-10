import service from '../services/calidad.service.js';
const listar=async(req,res,next)=>{try{res.json({data:await service.listar(req.query)})}catch(e){next(e)}};
const obtener=async(req,res,next)=>{try{res.json({data:await service.obtener(req.params.id)})}catch(e){next(e)}};
const crear=async(req,res,next)=>{try{res.status(201).json({data:await service.crear(req.body,req.user)})}catch(e){next(e)}};
const actualizar=async(req,res,next)=>{try{res.json({data:await service.actualizar(req.params.id,req.body,req.user)})}catch(e){next(e)}};
const metricas=async(_req,res,next)=>{try{res.json({data:await service.metricas()})}catch(e){next(e)}};
export default{listar,obtener,crear,actualizar,metricas};
