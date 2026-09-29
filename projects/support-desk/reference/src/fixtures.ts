import type {Detail} from './contracts';
export const fixtures:Detail[]=[
{id:'ticket-1',ownerId:'alex',title:'Printer offline',body:'The fictional reception printer is unavailable.',status:'open',createdAt:'2026-09-01T10:00:00.000Z',comments:[]},
{id:'ticket-2',ownerId:'alex',title:'VPN setup',body:'A fictional teammate needs setup instructions.',status:'pending',createdAt:'2026-09-01T10:00:00.000Z',comments:[]},
{id:'ticket-3',ownerId:'alex',title:'Keyboard replaced',body:'The spare keyboard was delivered.',status:'closed',createdAt:'2026-09-02T10:00:00.000Z',comments:[]},
{id:'ticket-4',ownerId:'morgan',title:'Private fictional payroll workstation',body:'This synthetic record belongs to Morgan.',status:'open',createdAt:'2026-09-03T10:00:00.000Z',comments:[]}
];
