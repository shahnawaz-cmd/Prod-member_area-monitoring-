const STICKER_VINS = [
  'JS1EM16B5T7101131',
  'JKAENVC1X4A185175',
  'JYARJ08E66A007585',
  'JKAKLEE17FDA80765',
  'JKAEX8A1XFA012306',
  'JKAEX8A15EA001115',
  '5Y4AH28Y0EA011611',
  'MH3RH06Y7FK008558',
  'USYAMA2768A414',
  'JYARN33E7FA006457',
  '5SAAK4CK2E7101013'
];

class ReverseDecode {
  constructor(vin = null, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // Shuffle and pick a random VIN if none is explicitly provided
    let targetVin = this.vin;
    if (!targetVin) {
      const randomIndex = Math.floor(Math.random() * STICKER_VINS.length);
      targetVin = STICKER_VINS[randomIndex];
    }
    console.log(`Starting Reverse Decode / Sticker Generate for VIN: ${targetVin}`);

    // Fill VIN
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.click();
    await vinInput.fill(targetVin);

    // Click Get Window Sticker
    const submitButton = page.getByRole('button', { name: 'Get Window Sticker' });
    await submitButton.waitFor({ state: 'visible', timeout: timeout });
    await submitButton.click();
    console.log("Clicked 'Get Window Sticker' button.");
  }
}

module.exports = {
  ReverseDecode
};
