import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
export async function connectDatabase(){
if(process.env.DATABASE_URL){const {default:pg}=await import('pg');const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();client.on('error',()=>{console.error('Database connection lost');process.exit(1)});const sql=s=>{let i=0;return s.replace(/\?/g,()=>'$'+(++i))};return {exec:s=>client.query(s),prepare:s=>({get:async(...v)=>(await client.query(sql(s),v)).rows[0],all:async(...v)=>(await client.query(sql(s),v)).rows,run:(...v)=>client.query(sql(s),v)}),close:()=>client.end()};}
if(process.env.NODE_ENV==='production')throw Error('DATABASE_URL is required in production.');
const dir=process.env.DATA_DIR||'./data';mkdirSync(dir,{recursive:true});const db=new DatabaseSync(dir+'/fitness.sqlite');db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');return db;
}
