module.exports = {
	"_data": {
		"_id": "erjp90r1",
		"_name": "FC 2014/227",
		"_description": "",
		"_documentType": "CustomerInvoice",
		"_externalNumber": "FC - 2014/227",
		"_date": "2014-07-21",
		"_relatedDocuments": [
			{
				"_name": "RC 2014/235",
				"_href": "/5v4080jn/documents/dw6492qa"
			},
			{
				"_name": "EC 2014/135",
				"_href": "/5v4080jn/documents/av649h5z"
			}
		],
		"_entity": {
			"_href": "/5v4080jn/entities/4xrzy0v5",
			"_description": "A Customer, LLC",
			"_address": "A Street, 125, Room 213\nA Town\nA Location WX1234\nGreat Britain",
			"_countryCode" : "GB",
			"_taxNumber": "ABC123456789"
		},
		"_currency": "GBP",
		"_grossAmount": {"GBP": 6456.90, "EUR": 8910.52},
		"_netAmount": {"GBP": 5234.50, "EUR": 7223.61},
		"_items": [
			{
				"_itemType": "Goods",
				"_href": "/5v4080jn/items/ero6j1rk",
				"_description": "Woman Polo Shirt",
				"_quantity": {"Cartons": 10},
				"_grossAmount": {"GBP": 1500.00, "EUR": 2070.00},
				"_discountAmount": {"GBP": 75.00, "EUR": 103.50},
				"_netAmount": {"GBP": 1425.00, "EUR": 1966.50},
				"_vatRate": "Standard", 
				"_vatAmount": {"GBP": 327.75, "EUR": 429.30}
				}
			},
			{
				"_description": "Shipping",
				"_itemType": "Transports",
				"_href": "/5v4080jn/items/dn0j11vy",
				"_grossAmount": {"GBP": 15.00, "EUR": 20.70},
				"_netAmount": {"GBP": 15.00, "EUR": 20.70},
				"_vatRate": "Standard",
				"_vatAmount": {"GBP": 3.28, "EUR": 4.29}
				},
			}
		],
		"_status": "active",
		"_lastModifiedDate": "2014-07-21T10:37:45Z"
	},
	"_links": {
		"_self": "/5v4080jn/documents/erjp90r1",
		"_documents": "/5v4080jn/documents?entity=4xrzy0v5",
		"_payments": "/5v4080jn/payments/?entity=4xrzy0v5"
	}
};
