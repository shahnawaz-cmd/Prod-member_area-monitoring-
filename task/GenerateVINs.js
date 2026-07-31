const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';
const BASE_VIN = '1FTFW1ET2DFD78356';

class GenerateUSVIN {
  constructor(method = 'mongo') {
    this.method = method; // 'random' or 'mongo'
  }

  static randomVin() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return BASE_VIN.slice(0, -1) + chars[Math.floor(Math.random() * chars.length)];
  }

  static async getVinFromMongo() {
    if (!MONGO_URI) {
      console.warn("⚠️ MONGO_URI environment variable is not defined. Skipping database connection.");
      return null;
    }
    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const coll = client.db(DB_NAME).collection(COLL_NAME);
      const doc = await coll.aggregate([{ $sample: { size: 1 } }]).toArray();
      return doc[0]?.vin;
    } catch (e) {
      console.error('Error fetching VIN from MongoDB:', e);
      return null;
    } finally {
      await client.close();
    }
  }

  async performAs(actor) {
    let generatedVin = null;
    try {
      if (this.method === 'mongo') {
        generatedVin = await GenerateUSVIN.getVinFromMongo();
      }
    } catch (e) {
      console.warn(`⚠️ VIN retrieval via ${this.method} failed: ${e.message}. Falling back to default VIN.`);
    }
    
    // Fallback to specific fallback VIN if Mongo retrieval fails
    if (!generatedVin) {
      generatedVin = '1FUJHHDR4MLMJ5064';
      console.log(`Using fallback generated VIN: ${generatedVin}`);
    }
    
    actor.usVin = generatedVin;
    console.log(`US VIN generated and set on actor: ${actor.usVin}`);
  }
}

class ClassicMappedVIN {
  constructor(baseVin = '228871N111628', isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const timeout = this.isSlowNetwork ? 10000 : 5000;
    console.log(`Using base Classic Mapped VIN directly (Condition-based timeout check: ${timeout}ms)...`);
    
    // Simulating a condition-based timeout delay if needed
    await actor.page.waitForTimeout(timeout / 5); 

    /*
    const chars = this.baseVin.split('');
    const random1 = Math.floor(Math.random() * 10).toString();
    const random2 = Math.floor(Math.random() * 10).toString();
    
    if (chars.length >= 2) {
      chars[chars.length - 1] = random1; // Last character (numeric)
      chars[chars.length - 2] = random2; // 2nd to last character (numeric)
    }
    
    actor.classicVin = chars.join('');
    */
    
    actor.classicVin = this.baseVin;
    console.log(`Classic VIN set to base value: ${actor.classicVin}`);
  }
}

class EUMappedVIN {
  constructor(vins = ['WAUZZZ8P6CA083445', 'VF1AGVYB055491691'], isSlowNetwork = false) {
    this.vins = Array.isArray(vins) ? vins : [vins];
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const timeout = this.isSlowNetwork ? 10000 : 5000;
    console.log(`Generating EU VIN from list (Condition-based timeout check: ${timeout}ms)...`);
    
    await actor.page.waitForTimeout(timeout / 5);

    // Pick a random base VIN from the list
    const baseVin = this.vins[Math.floor(Math.random() * this.vins.length)];
    const chars = baseVin.split('');
    
    // Randomize the last digit
    const randomDigit = Math.floor(Math.random() * 10).toString();
    if (chars.length >= 1) {
      chars[chars.length - 1] = randomDigit;
    }
    
    actor.euVin = chars.join('');
    console.log(`Selected and randomized EU VIN: ${actor.euVin}`);
  }
}

module.exports = {
  GenerateUSVIN,
  ClassicMappedVIN,
  EUMappedVIN
};
