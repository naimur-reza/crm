function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIpInRange(ip: string, range: string): boolean {
  const parts = range.split("/");
  const rangeIp = parts[0];
  const bits = parts[1] ? parseInt(parts[1], 10) : 32;
  const mask = ~(2 ** (32 - bits) - 1) >>> 0;
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(rangeIp);
  return (ipInt & mask) === (rangeInt & mask);
}

export function isOfficeNetwork(clientIp: string): boolean {
  const ranges = process.env.OFFICE_IP_RANGES;
  if (!ranges) return true;

  const ips = clientIp.split(",").map((ip) => ip.trim());

  return ranges.split(",").some((range) => {
    const trimmed = range.trim();
    if (!trimmed) return false;
    if (!trimmed.includes("/")) {
      return ips.includes(trimmed);
    }
    return ips.some((ip) => isIpInRange(ip, trimmed));
  });
}
