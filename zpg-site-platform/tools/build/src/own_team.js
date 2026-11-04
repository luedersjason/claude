  // Firms and people from the watermain portal contacts (_data.json). Unknown = "to confirm"; nothing guessed.
  const firms={"zpg": {"n": "Zilber Property Group", "g": "Developer", "web": "https://www.zilberpropertygroup.com", "ph": "", "addr": "710 N. Plankinton Ave., Suite 1100, Milwaukee, WI"}, "pin": {"n": "Pinnacle Engineering Group", "g": "Civil engineer", "web": "https://pinnacle-engr.com", "ph": "262-754-8888", "addr": "Brookfield, WI"}, "vpp": {"n": "Village of Pleasant Prairie", "g": "Municipality", "web": "", "ph": "", "addr": "Pleasant Prairie, WI"}, "kwu": {"n": "Kenosha Water Utility", "g": "Water utility", "web": "", "ph": "", "addr": "Kenosha, WI"}, "wdnr": {"n": "Wisconsin DNR", "g": "Permitting agency", "web": "", "ph": "", "addr": ""}, "usace": {"n": "US Army Corps of Engineers, St. Paul District", "g": "Permitting agency", "web": "", "ph": "", "addr": ""}};
  const P=[
    {"id":"lueders","f":"zpg","fn":"Jason","ln":"Lueders","t":"Director of Construction","r":"Contract signatory","em":"jason.lueders@zilber.com","ph":"630-344-3718"},
    {"id":"kleinke","f":"zpg","fn":"Lisa","ln":"Kleinke","t":"","r":"Standard contract forms","em":"lisa.kleinke@zilber.com"},
    {"id":"navis","f":"zpg","fn":"Chad","ln":"Navis","t":"","r":"cc on the bid thread","em":"chad.navis@zilber.com"},
    {"id":"shoaf","f":"pin","fn":"Andy","ln":"Shoaf","t":"Associate Project Manager, PE","r":"Plans, project manual, DNR submittal","em":"Andrew.Shoaf@pinnacle-engr.com"},
    {"id":"johnson","f":"pin","fn":"Justin","ln":"Johnson","t":"","r":"","em":"jjohnson@pinnacle-engr.com"},
    {"id":"artz","f":"pin","fn":"Adam","ln":"Artz","t":"","r":"","em":"Adam.Artz@pinnacle-engr.com"},
    {"id":"zanon","f":"pin","fn":"Anthony","ln":"Zanon","t":"","r":"Named on the proposal form"},
    {"id":"davidsen","f":"vpp","fn":"Kurt","ln":"Davidsen","t":"Village Engineer, PE","r":"","em":"kdavidsen@pleasantprairiewi.gov","ph":"262-925-6728"},
    {"id":"herrick","f":"vpp","fn":"Peggy","ln":"Herrick","t":"Assistant Community Development Director","r":"Approval letter contact","em":"pherrick@pleasantprairiewi.gov","ph":"262-925-6716"},
    {"id":"hanson","f":"vpp","fn":"Rob","ln":"Hanson","t":"Community Development Director","r":"Signed the approval letter","ph":"262-925-6717"},
    {"id":"tomczyk","f":"vpp","fn":"Sarah","ln":"Tomczyk","t":"Assistant Village Engineer","r":"","em":"stomczyk@pleasantprairiewi.gov"},
    {"id":"bagley","f":"kwu","fn":"Ian","ln":"Bagley","t":"Director of Engineering, PE","r":"Signed the KWU approval","em":"ibagley@kenosha.org","ph":"262-653-4349"},
    {"id":"czarnecki","f":"kwu","fn":"Curt","ln":"Czarnecki","t":"General Manager, PE","r":"","em":"cczarnecki@kenosha.org","ph":"262-653-4306"},
    {"id":"ponzi","f":"wdnr","fn":"Sonya","ln":"Ponzi","t":"","r":"Wetland and pond permits","em":"sonya.ponzi@wisconsin.gov","ph":"608-598-0346"},
    {"id":"kinney","f":"usace","fn":"Lorin","ln":"Kinney","t":"","r":"Section 404 permit MVP-2017-01912-LRK","em":"Lorin.R.Kinney@usace.army.mil","ph":"651-383-5914"}
  ];
