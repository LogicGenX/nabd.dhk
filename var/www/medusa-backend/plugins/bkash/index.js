class BkashService {
  static identifier = 'bkash'

  constructor(_, options) {
    this.options = options
  }

  async createPayment() {
    // integrate bKash REST here
    return { status: 'created' }
  }

  async authorizePayment() {
    return { status: 'authorized' }
  }

  async capturePayment() {
    return { status: 'captured' }
  }
}

module.exports = BkashService
