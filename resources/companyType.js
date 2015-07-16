module.exports = {
  _id: String,
  _data: {
    _name: String,
    _description: String,
    _addresses: {
      _main: String
    },
    _taxNumber: String,
    _currency: String,
    _country: String,
    _earliestVatDate: String,
    _earliestAccountingDate: String
  },
  _status: String,
  _lastModifiedDate: String,
  _links: {
    _self: String,
    _company: String,
    _documents: String,
    _entities: String,
    _items: String
  }
};
