const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';

// 100% Genuine European Region Mapped VINs (Germany, France, UK, Italy, Spain, etc.)
const VERIFIED_MAPPED_EU_VINS = [
  'W0L0AHL70A8090303', // Opel Germany
  'VF1AGVYB055491691', // Renault France
  'VF3YC2MFB12G20874', // Peugeot France
  'WBY1Z62030V719559', // BMW i Germany
  'WV1ZZZSYZL9025249', // VW Commercial Germany
  'SHHEU88701U002012', // Honda UK
  'WAUZZZ8V5DA002440', // Audi A3/S3 Germany
  'WAUZZZ8P69B013708', // Audi A3 Germany
  'WAUZZZ8P57A029644', // Audi A3 Germany
  'WAUZZZ8PXBA080596', // Audi A3 Germany
  'WAUZZZ8V3DA026526', // Audi A3 Germany
  'WAUZZZ8P0CA119293', // Audi A3 Germany
  'WAUZZZ8V7EA021833', // Audi A3 Germany
  'WAUZZZ8P38A024802', // Audi A3 Germany
  'WAUZZZ8P5AA146437', // Audi A3 Germany
  'WAUZZZ8V8F1117990', // Audi A3 Germany
  'WAUZZZ8V6KA054138', // Audi A3 Germany
  'WAUZZZ8P45A120627', // Audi A3 Germany
  'WAUZZZ8V4GA130608', // Audi A3 Germany
  'WAUZZZ8P6CA083402', // Audi A3 Germany
  'WAUZZZ8V2DA066502', // Audi A3 Germany
  'WAUZZZ8V3LA027674', // Audi A3 Germany
  'WAUZZZ8V8EA022859', // Audi A3 Germany
  'WAUZZZ8V2HA013501', // Audi A3 Germany
  'WAUZZZ8V1KA054810', // Audi A3 Germany
  'WAUZZZ8P78A108850', // Audi A3 Germany
  'WAUZZZ8P19A128674', // Audi A3 Germany
  'WAUZZZ8V7HA068946', // Audi A3 Germany
  'WAUZZZ8P44A035477', // Audi A3 Germany
  'WAUZZZ8P2AA171408', // Audi A3 Germany
  'WAUZZZ8P59A126118', // Audi A3 Germany
  'WAUZZZ8P37A107984', // Audi A3 Germany
  'NMTER16R50R103157', // Toyota Europe
  'NMTEA16R90R166933', // Toyota Europe
  'SB1Z93BE40E149641', // Toyota UK
  'SB1KZ28E40E037750', // Toyota UK
  'SB1JZ28E80E082086', // Toyota UK
  'JTDKZ28E400058252', // Toyota Europe Spec
  'SALWA2EE7GA558285', // Land Rover UK
  'SALWA2KE6EA335351'  // Land Rover UK
];

const EU_INDEXED_PREFIXES = ['WAUZZZ', 'WV1ZZZ', 'WVWZZZ', 'VF1', 'VF3', 'W0L', 'WBY', 'SAL', 'SB1', 'SHH', 'NMT'];

class FetchEUVIN {
  static getRandomFallbackVin() {
    const randomIndex = Math.floor(Math.random() * VERIFIED_MAPPED_EU_VINS.length);
    return VERIFIED_MAPPED_EU_VINS[randomIndex];
  }

  static async getEUVinFromMongo() {
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

      const prefix = EU_INDEXED_PREFIXES[Math.floor(Math.random() * EU_INDEXED_PREFIXES.length)];
      const randomSkip = Math.floor(Math.random() * 20);
      const doc = await coll.findOne(
        { vin: { $gte: prefix, $lt: prefix + '\uffff' } },
        {
          skip: randomSkip,
          projection: { vin: 1, make: 1, model: 1, year: 1 },
          maxTimeMS: 1500
        }
      );

      if (doc?.vin) {
        console.log(`Fetched 100% EU VIN from MongoDB -> VIN: ${doc.vin} | Make: ${doc.make || 'EU'}`);
        return doc.vin;
      }
      return null;
    } catch (e) {
      console.warn(`MongoDB EU VIN query note: ${e.message}. Using instant verified EU fallback.`);
      return null;
    } finally {
      await client.close().catch(() => {});
    }
  }

  async performAs(actor) {
    let vin = null;
    try {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2000));
      vin = await Promise.race([FetchEUVIN.getEUVinFromMongo(), timeoutPromise]);
    } catch {
      vin = null;
    }

    if (!vin) {
      vin = FetchEUVIN.getRandomFallbackVin();
    }

    // Ponytail Rule: Randomize ONLY the 17th character to preserve 100% valid European chassis specs
    const prefix = vin.slice(0, 16);
    const randomSuffix = Math.floor(Math.random() * 10).toString();
    actor.euVin = prefix + randomSuffix;
    console.log(`EU VIN set on actor (randomized last char): ${actor.euVin}`);
  }
}

module.exports = FetchEUVIN;
