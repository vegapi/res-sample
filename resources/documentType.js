module.exports = {
	"_data": {
		"_name": String,
		"_description": String,
		"_documentType": String,
		"_externalNumber": String,
		"_date": String,
		"_relatedDocuments": [
			{
				"_id": String,
				"_name": String
			}
		],
		"_entity": {
			"_id": String,
			"_description": String,
			"_address": String,
			"_countryCode" : String,
			"_taxNumber": String
		},
		"_currency": String,
		"_grossAmount": {"GBP": Number, "EUR": Number},
		"_netAmount": {"GBP": Number, "EUR": Number},
		"_items": [
			{
				"_itemType": String,
				"_id": String,
				"_description": String,
//				"_quantity": {"Cartons": Number},
				"_grossAmount": {"GBP": Number, "EUR": Number},
//				"_discountAmount": {"GBP": Number, "EUR": Number},
				"_netAmount": {"GBP": Number, "EUR": Number},
				"_vatRate": String, 
				"_vatAmount": {"GBP": Number, "EUR": Number}
			}
		]
	},
  _status: String,
  _lastModifiedDate: String,
  _links: {
    _self: String,
    _documents: String,
    _settings: String
  }
};
