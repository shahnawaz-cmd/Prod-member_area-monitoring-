const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';

// Fallback list of valid motorcycle VINs if Mongo is unreachable or MONGO_URI is not configured
const FALLBACK_MOTORCYCLE_VINS = [
  'ML5LEGC14TDAA1198', // Kawasaki
  'JS1VY53A272103168', // Suzuki
  'MH3RH25E2TK009101', // Yamaha
  'JKAKXGKC6MA000017', // Kawasaki
  'JYARM48E4TA005294', // Yamaha
  'JKBZXJK1XSA007197', // Kawasaki
  '56KMTC006P3190867', // Indian
  'VBKUSV408JM712767', // Husqvarna
  'JKAEX8A1XFA012306', // Kawasaki
  'JS1EM16B5T7101131', // Suzuki
  'JYARJ08E66A007585'  // Yamaha
];

// Recognized motorcycle and powersport makes in the database
const MOTORCYCLE_MAKES = [
  'Kawasaki', 'KAWASAKI', 'Kawasaki2399',
  'Yamaha', 'YAMAHA', 'Yamaha077780',
  'Suzuki', 'SUZUKI',
  'Harley-Davidson', 'Harley Davidson', 'Harley', 'HARLEY', 'HARLEY-DAVIDSON', 'HarleyDavidson',
  'Indian', 'INDIAN', 'Indian Motorcycle', 'INDIAN MOTORCYCLE CO.',
  'Husqvarna', 'HUSQVARNA', 'Husqvarna Motorcycles',
  'Ducati', 'DUCATI',
  'KTM', 'Ktm',
  'Triumph', 'TRIUMPH', 'Triumph Motorcycles', 'TRIUMPH MOTORCYCLE',
  'Aprilia', 'APRILIA',
  'Polaris', 'POLARIS', 'Polaris Slingshot',
  'Can-Am', 'CAN-AM',
  'Victory', 'VICTORY', 'Victory Motorcycles',
  'Buell', 'BUELL',
  'MV Agusta', 'Mv Agusta',
  'Moto Guzzi'
];

class FetchMotorcycleVIN {
  static async getMotorcycleVinFromMongo() {
    if (!MONGO_URI) {
      console.warn("⚠️ MONGO_URI environment variable is not defined. Using fallback motorcycle VIN.");
      return null;
    }

    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const coll = client.db(DB_NAME).collection(COLL_NAME);
      const docs = await coll.aggregate([
        { $match: { make: { $in: MOTORCYCLE_MAKES } } },
        { $sample: { size: 1 } }
      ]).toArray();

      if (docs && docs.length > 0 && docs[0]?.vin) {
        const doc = docs[0];
        console.log(`Fetched Motorcycle VIN from MongoDB -> VIN: ${doc.vin} | Make: ${doc.make} | Model: ${doc.model || 'N/A'} | Year: ${doc.year || 'N/A'}`);
        return doc.vin;
      }
      return null;
    } catch (e) {
      console.error('Error fetching Motorcycle VIN from MongoDB:', e.message);
      return null;
    } finally {
      await client.close();
    }
  }

  async performAs(actor) {
    let vin = null;
    try {
      vin = await FetchMotorcycleVIN.getMotorcycleVinFromMongo();
    } catch (e) {
      console.warn(`⚠️ Motorcycle VIN retrieval from MongoDB failed: ${e.message}.`);
    }

    if (!vin) {
      const randomIndex = Math.floor(Math.random() * FALLBACK_MOTORCYCLE_VINS.length);
      vin = FALLBACK_MOTORCYCLE_VINS[randomIndex];
      console.log(`Using fallback motorcycle VIN: ${vin}`);
    }

    actor.motorcycleVin = vin;
    console.log("Motorcycle VIN set on actor:", actor.motorcycleVin);
  }
}

module.exports = FetchMotorcycleVIN;
