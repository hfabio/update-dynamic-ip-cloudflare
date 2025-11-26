const fs = require('node:fs');
const path = require('node:path');
const {getIp, log, sleep, testIp, headers} = require('./helpers');

const zone_names = process.env.DOMAINS.split(',');
const IP_FILE_CACHE = path.join(__dirname, 'ip.txt');

let currentIp = '';
if(fs.existsSync(IP_FILE_CACHE)){
  const ip = fs.readFileSync(IP_FILE_CACHE, 'utf8');
  if(ip && testIp(ip)) currentIp = ip;
}

const updateIp = async (ip) => {
  const zonesRequest = await fetch(`https://api.cloudflare.com/client/v4/zones`,{
    method: 'GET',
    headers
  });
  const zones = (await zonesRequest.json())?.result;
  if(!zones?.length) throw new Error('No zones found');
  zones.forEach(async ({id, name}) => {
    if(!id || !zone_names.includes(name)) return;
    const identifier = id;
    if(!identifier) throw new Error('No valid zone');
    const recordsRequest = await fetch(`https://api.cloudflare.com/client/v4/zones/${identifier}/dns_records`,{
      method: 'GET',
      headers
    });
    const records = (await recordsRequest.json())?.result;
    if(!records.length) throw new Error('No subdomains found');
    const recordsToUpdate = records.filter(({content}) => content !== ip);
    if(!recordsToUpdate.length) {
      log('No records to update');
      return;
    }else{
      log(`${recordsToUpdate.length} records to update`)
    }
    await Promise.all(recordsToUpdate.map(async record => {
      const body = JSON.stringify({
        type: record.type,
        name: record.name,
        content: ip,
        proxied: true,
      });
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${record?.zone_id || identifier}/dns_records/${record.id}`, {
      method: 'PUT',
      headers: {
        ...headers,
      },
      body
      });
      if(response.status === 200) log(`updated subdomain: ${record?.zone_id || identifier}:${record.name} from ${record.content} to ${ip}`);
      if(response.status === 400) {
        log(''.padStart(50, '-'))
        log(record.name)
        log(body)
        log(await response.json())
      }
    }));
  })
  fs.writeFileSync(IP_FILE_CACHE, ip);
}

const main = async () => {
  while (true) {
    log('check ip');
    const ip = await getIp();
    if(!currentIp || ip !== currentIp) {
      try {
        await updateIp(ip);
      } catch (error) {
        log(error.message)
      }
    }
    if(!currentIp) currentIp = ip;
    log('ip is up to date', currentIp)
    await sleep(10);
  }
}

main()
