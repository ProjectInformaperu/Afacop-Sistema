export const C = { primary:'#0B22A1',primary2:'#3047D8',bg:'#F4F7FB',surface:'#FFFFFF',text:'#20242A',muted:'#6F7883',border:'#DDE3EA',success:'#10B981',warning:'#F59E0B',danger:'#EF4444',info:'#2563EB',purple:'#7C3AED' };
export const statusColors:Record<string,string>={LIBRE:'#334155',PENDIENTE:'#F59E0B',PROGRAMADA:'#F59E0B',EN_VISITA:'#2563EB',EN_PROCESO:'#10B981',GESTIONADO:'#10B981',VISITADO:'#10B981',FINALIZADA:'#2563EB',REPROGRAMADO:'#F59E0B',NO_ENCONTRADO:'#EF4444',CANCELADA:'#EF4444',ACTIVO:'#10B981',INACTIVO:'#94A3B8',APTO:'#10B981',NO_APTO:'#EF4444'};
export const money=(v:unknown)=>Number(v||0).toLocaleString('es-PE',{style:'currency',currency:'PEN'});
export const shortDate=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('es-PE',{timeZone:'UTC'}):'—';
