const FIRST_NAMES = [
  'alex', 'david', 'jason', 'michael', 'daniel', 'marcus', 'brian', 
  'ryan', 'eric', 'kevin', 'sarah', 'emily', 'rachel', 'claire', 'jessica'
];

const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

class GenerateEmail {
  constructor(tag = null) {
    this.tag = tag; // e.g. 'sticker', 'cancel', or null
  }

  async performAs(actor) {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3-digit unique number (e.g. 742)
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];

    if (this.tag && this.tag !== 'test') {
      const cleanTag = this.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
      actor.email = `memberareamonitoring.${cleanTag}.${fn}${num}@${domain}`;
    } else {
      actor.email = `memberareamonitoring.${fn}${num}@${domain}`;
    }

    // Strong, compliant password e.g. PassAlex742!
    const capitalizedName = fn.charAt(0).toUpperCase() + fn.slice(1);
    actor.password = `Pass${capitalizedName}${num}!`;

    console.log(`Generated email: ${actor.email}`);
  }
}

module.exports = GenerateEmail;
