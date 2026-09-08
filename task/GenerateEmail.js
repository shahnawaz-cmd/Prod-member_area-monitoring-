class GenerateEmail {
  constructor(tag = null) {
    this.tag = tag; // e.g. 'sticker', 'cancel', or null
  }

  async performAs(actor) {
    const num = Math.floor(100 + Math.random() * 900); // 3-digit unique number
    const domain = 'cwatest.com';

    if (this.tag && this.tag !== 'test') {
      const cleanTag = this.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
      actor.email = `cwa.${cleanTag}.${num}@${domain}`;
    } else {
      actor.email = `cwa.${num}@${domain}`;
    }

    actor.password = `PassTest${num}!`;
    console.log(`Generated email: ${actor.email}`);
  }
}

module.exports = GenerateEmail;
