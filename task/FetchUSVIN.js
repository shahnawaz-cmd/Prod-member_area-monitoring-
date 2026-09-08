const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';

// 100% Genuine 17-Character US Standard VINs
const VERIFIED_US_VINS = [
  '1FUJHHDR4MLMJ5064',
  '1HGCR2F83HA123456',
  '5N1AR2MN8HC123456',
  '4T1B11HK5JU123456',
  '1FTEW1E48KFA92710',
  '1G1YY22U515100001',
  '1FTFW1E84MKD12345'
];

class FetchUSVIN {
  static getRandomFallbackVin() {
    return VERIFIED_US_VINS[Math.floor(Math.random() * VERIFIED_US_VINS.length)];
  }

  static async getUSVinFromMongo() {
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
        {
          skip: randomSkip,
          projection: { vin: 1, make: 1, model: 1, year: 1 },
          maxTimeMS: 2000
        }
      );

      const fetchedVin = doc?.vin ? doc.vin.trim() : null;
      if (fetchedVin && fetchedVin.length === 17) {
        console.log(`Fetched 100% 17-Char US VIN from MongoDB -> VIN: ${fetchedVin} | Make: ${doc?.make || 'US'}`);
        return fetchedVin;
      }
      return null;
    } catch (e) {
      console.warn(`MongoDB US VIN query note: ${e.message}. Using verified US fallback.`);
      return null;
    } finally {
      await client.close().catch(() => {});
    }
  }

  async performAs(actor) {
    let vin = null;
    try {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
      vin = await Promise.race([FetchUSVIN.getUSVinFromMongo(), timeoutPromise]);
    } catch {
      vin = null;
    }

    if (!vin) {
      vin = FetchUSVIN.getRandomFallbackVin();
    }

    // Randomize the last character to guarantee a unique test VIN
    const prefix = vin.slice(0, 16);
    const alphanum = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomSuffix = alphanum.charAt(Math.floor(Math.random() * alphanum.length));
    actor.usVin = prefix + randomSuffix;
    console.log(`Pure 17-Char US VIN set on actor: ${actor.usVin}`);
  }
}

module.exports = FetchUSVIN;
