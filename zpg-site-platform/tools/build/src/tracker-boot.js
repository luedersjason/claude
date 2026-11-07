(async function tracker(){
  const DNAME={Design:'Drawings and Design',Approvals:'Village, DSPS & permits',Steel:'Structural & steel',Fire:'Fire protection',MEP:'MEP & process piping','General Contractor':'General Contractor',Jaquet:'Owner decisions (Jaquet)'};
  if(!window.NittoTrackerSync){const body=document.getElementById('tkBody');if(body)body.innerHTML='<tr><td colspan="5" class="note">The tracker could not load. Reload the page to try again.</td></tr>';return;}
  await window.NittoTrackerSync.boot({DNAME:DNAME,signIn:'Sign in to claude.ai to see the tracker.',refPrefix:'J-'});
})();
