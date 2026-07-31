class GenerateEmail {
  constructor(prefix = 'test') {
    this.prefix = prefix;
  }

  async performAs(actor) {
    const timeBase36 = Date.now().toString(36); // e.g. 'kru0tpxg' (8 characters)
    const randomStr = Math.random().toString(36).substring(2, 6); // e.g. 'a8f3' (4 characters)
    
    actor.email = `${this.prefix}_${randomStr}@t${timeBase36}.com`;
    
    // Generate a dynamic password matching standard security requirements
    actor.password = `Pass_${randomStr}${timeBase36}!`;
    
    console.log(`Generated unique email: ${actor.email}`);
    console.log(`Generated unique password: ${actor.password}`);
  }
}

module.exports = GenerateEmail;
