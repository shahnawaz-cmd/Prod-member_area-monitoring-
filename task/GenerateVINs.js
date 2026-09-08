const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';
class GenerateUSVIN {
  static async getVinFromMongo() {
    if (!MONGO_URI) {
      return null;
    }
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      socketTimeoutMS: 2500
    });
    try {
      await client.connect();
      const coll = client.db(DB_NAME).collection(COLL_NAME);
      const randomSkip = Math.floor(Math.random() * 200);
      const doc = await coll.findOne(
        { $expr: { $eq: [{ $strLenCP: "$vin" }, 17] } },
        { skip: randomSkip, projection: { vin: 1 }, maxTimeMS: 2000 }
      );
      const fetchedVin = doc?.vin ? doc.vin.trim() : null;
      return (fetchedVin && fetchedVin.length === 17) ? fetchedVin : null;
    } catch (e) {
      console.warn(`MongoDB US VIN query skipped (${e.message}). Using instant fallback.`);
      return null;
    } finally {
      await client.close().catch(() => {});
    }
  }

  async performAs(actor) {
    let generatedVin = null;
    try {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
      generatedVin = await Promise.race([GenerateUSVIN.getVinFromMongo(), timeoutPromise]);
    } catch {
      generatedVin = null;
    }
    
    // Fallback to verified VIN if Mongo retrieval fails
    if (!generatedVin) {
      const fallbackVins = ['1FUJHHDR4MLMJ5064', '1HGCR2F83HA123456', '5N1AR2MN8HC123456', '4T1B11HK5JU123456'];
      generatedVin = fallbackVins[Math.floor(Math.random() * fallbackVins.length)];
      console.log(`Using fallback generated VIN: ${generatedVin}`);
    }
    
    actor.usVin = generatedVin;
    console.log("US VIN set on actor:", actor.usVin);
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
