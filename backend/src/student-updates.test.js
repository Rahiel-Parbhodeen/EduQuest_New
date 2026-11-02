import {describe,it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import {messageSchema,futureMeeting,registerStudentUpdates} from './student-updates.js';
describe('student updates validation',()=>{
 it('rejects blank, oversized and profane messages',()=>{for(const body of ['  ','x'.repeat(2001),'fuck you'])expect(messageSchema.safeParse({body}).success).toBe(false);expect(messageSchema.parse({body:'  Hello classmate  '}).body).toBe('Hello classmate')});
 it('rejects past or invalid meeting times',()=>{for(const v of ['yesterday',new Date(Date.now()-60000).toISOString()])expect(futureMeeting.safeParse(v).success).toBe(false);expect(futureMeeting.safeParse(new Date(Date.now()+3600000).toISOString()).success).toBe(true)});
 function setup(role='student',query=async()=>({rowCount:0,rows:[]})){const app=express();app.use(express.json());registerStudentUpdates({app,pool:{query},requireAuth:(req,res,next)=>{req.user={userId:'11111111-1111-4111-8111-111111111111',role};next()},requireRole:r=>(req,res,next)=>role===r?next():res.sendStatus(403)});return app}
 it('rejects nonstudents and invalid recipients',async()=>{expect((await request(setup('lecturer')).get('/api/v1/students/directory')).status).toBe(403);expect((await request(setup()).post('/api/v1/messages/not-a-uuid').send({body:'Hi'})).status).toBe(400);expect((await request(setup()).post('/api/v1/messages/22222222-2222-4222-8222-222222222222').send({body:'Hi'})).status).toBe(404)});
 it('rejects profanity before persisting a message',async()=>{let writes=0;const app=setup('student',async sql=>{if(sql.startsWith('INSERT'))writes++;return {rowCount:1,rows:[{}]}});const r=await request(app).post('/api/v1/messages/22222222-2222-4222-8222-222222222222').send({body:'fuck you'});expect(r.status).toBe(400);expect(writes).toBe(0)});
 it('does not disclose inaccessible documents',async()=>{expect((await request(setup()).get('/api/v1/resources/22222222-2222-4222-8222-222222222222/file')).status).toBe(404)});
});
