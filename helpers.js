const SECOND = 1000;
const MINUTE = 60 * SECOND;
const testIp = ip => /^\d{2,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/g.test(ip);
const token = process.env.CLOUDFLARE_TOKEN;

const sleep = time => new Promise((resolve) => setTimeout(() => resolve, time * MINUTE));
const log = message => console.log(`[LOG - ${new Date().toLocaleString()}] ${typeof message === 'object' ? JSON.stringify(message) : message}`);

const headers = {
  'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

const getIp = async () => {
  try {
    const result = await fetch('https://api.bigdatacloud.net/data/client-ip').then(async r  => await r.json());
    const ip = result['ipString'];
    log(ip);
    if(ip && testIp(ip)) return ip;
    throw new Error('IP not valid: '+ ip);
  } catch (error) {
    log('error getting new IP: ' +  error.message);
  }
}

module.exports = {
  sleep,
  log,
  getIp,
  testIp,
  headers
}