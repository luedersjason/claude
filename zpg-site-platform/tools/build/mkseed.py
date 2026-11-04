import json, datetime
D = json.load(open('/home/user/claude/nitto-portal/_data.json'))
def ms(iso, h=12):
    d = datetime.datetime.fromisoformat(iso).replace(hour=h, tzinfo=datetime.timezone(datetime.timedelta(hours=-6)))
    return int(d.timestamp()*1000)
def md(s):  # '08/11' -> '8/11'
    m, d = s.split('/')[:2]; return '%d/%d' % (int(m), int(d))
out = {k: {} for k in ['issues','reviewItems','reviews','doclog','feed','validations','sweeps']}
ST = {'done':'Done','active':'In progress','attn':'Open','open':'Open'}
n = 0
for w in D['ws']:
    for s in w['steps']:
        n += 1; ref = 'N-%02d' % n
        it = {'ref':ref,'title':s['t'],'owner':s['o'],'area':w['name'],'status':ST[s['s']],'now':s['n'],
              'next':'11/4: Imported from the watermain portal (step list).','order':n,'updated':'11/4','blockedBy':[]}
        if s.get('d'):
            it['confirmed'] = md(s['d']); it['source'] = 'Watermain portal step list'
        out['issues'][ref] = it
order = 0
for g in D['review']:
    for it in g['items']:
        order += 1
        out['reviewItems'][it['k']] = {'k':it['k'],'g':g['g'],'order':order,'t':it['t'],'where':it['where'],'who':it['who'],
            'cur':it['cur'],'new':it['new'],'why':it['why'],'deliver':it['deliver']}
        dec = it.get('dec','open'); note = it.get('note','')
        decided = dec != 'open' or note
        out['reviews'][it['k']] = {'dec':dec,'note':note,'at':ms('2026-11-04',16) if decided else 0,'by':'jason' if decided else ''}
DL = [
 ('2026-11-04','KWU approval letter','Plans compatible with KWU systems and approved. 1 page in the viewer.','Ian Bagley, KWU'),
 ('2026-11-03','Public watermain plans, bid set (rev. 4)','Bid set / Village resubmittal; 8 sheets (C-1 to C-8) in the viewer.','Andy Shoaf, Pinnacle'),
 ('2026-11-03','Project manual (contract, terms, proposal form)','Resubmitted with the plans; 12 pages in the viewer.','Andy Shoaf, Pinnacle'),
 ('2026-10-16','WDNR Section 401 water quality certification','Issued for Corps permit MVP-2017-01912-LRK.','Sonya Ponzi, WDNR'),
 ('2026-10-15','WDNR wetland individual permit IP-SE-2026-30-01917','Issued. Completion date reads 10/15/2026 and the permit page is headed 02789; to be corrected.','Sonya Ponzi, WDNR'),
 ('2026-10-15','WDNR pond individual permit IP-SE-2026-30-02789','Issued, approving the 4/27/2020 plans.','Sonya Ponzi, WDNR'),
 ('2026-08-25','DA conditional approval letter','Conditions 1-12 for the CSM, SWMA, DA, financial security, closing, recording and precon.','Rob Hanson, Village'),
 ('2026-08-25','Development Agreement (draft) with exhibits','Received with the approval packet. Exhibits D1 and D2 are blank; first 18 pages and Exhibits D, D1, D2 in the viewer.','Rob Hanson, Village'),
 ('2026-08-25','CSM dedication and covenant language (draft 8/13/26)','Received with the approval packet. Owner spelled "Lakeveiw" on line 1.','Rob Hanson, Village'),
 ('2026-08-25','Stormwater Maintenance Agreement (draft)','Received with the approval packet. Exhibit B still needed.','Rob Hanson, Village'),
 ('2026-08-11','Village Engineer comments (marked plans)','Review comments on the public improvement plans; attached to the approval letter (condition 3).','Village Engineer'),
]
for i,(d,doc,ch,fr) in enumerate(DL):
    y,m,dd = d.split('-'); out['doclog']['d%02d' % (i+1)] = {'date':'%d/%d/%s' % (int(m),int(dd),y[2:]),'doc':doc,'change':ch,'from':fr,'at':ms(d)-i}
for i,e in enumerate(sorted(D['events'], key=lambda e:e['d'])):
    out['feed']['e%s-%d' % (e['d'].replace('-',''), i)] = {'text':e['t'],'at':ms(e['d'])+i,'by':''}
json.dump(out, open('/home/user/claude/zpg-site-platform/seed/seed.json','w'), indent=1, ensure_ascii=False)
print({k:len(v) for k,v in out.items()})
