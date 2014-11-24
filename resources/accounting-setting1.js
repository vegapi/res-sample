module.exports = {
	"_data": {
		"_id": "xyz100ab",
		"_name": "Settings 2014-1",
		"_documentType": {
			"CustomerOrder": {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "EC"
			},
			"SupplierOrder": {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "EF"
			},
			"CustomerDelivery" : {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "RC"
			},
			"SupplierDelivery": {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "RF"
			},
			"CustomerReturn" : {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "DC"
			},
			"SupplierReturn": {
				"_ledgerAccount": null,
				"_internalNumberPrefix": "DF"
			},
			"CustomerInvoice": {
				"_ledgerAccount": "2111",
				"_ledgerType": "revenue",
				"_internalNumberPrefix": "FC"
			},
			"SupplierInvoice": {
				"_ledgerAccount": "2211",
				"_ledgerType": "expense",
				"_internalNumberPrefix": "FF"
			},
			"CustomerDebit": {
				"_ledgerAccount": "2111",
				"_ledgerType": "revenue",
				"_internalNumberPrefix": "DBC"
			},
			"SupplierDebit": {
				"_ledgerAccount": "2211",
				"_ledgerType": "expense",
				"_internalNumberPrefix": "DBF"
			},
			"CustomerCredit": {
				"_ledgerAccount": "2111",
				"_ledgerType": "revenue",
				"_internalNumberPrefix": "CRC"
			},
			"SupplierCredit": {
				"_ledgerAccount": "2211",
				"_ledgerType": "expense",
				"_internalNumberPrefix": "CRF"
			},
			"ExpenseReport": {
				"_ledgerAccount": "278",
				"_ledgerType": "expense",
				"_internalNumberPrefix": "OD"
			},
			"RevenueReport": {
				"_ledgerAccount": "278",
				"_ledgerType": "revenue",
				"_internalNumberPrefix": "OR"
			}
		},
		"_itemType": {
			"Materials": {
				"expense": "312",
				"vat": "2432"
			},
			"Goods": {
				"revenue": {
					"amount": "712",
					"discount": "718",
					"vat": "2433"
				},
				"expense": {
					"amount": "312",
					"discount": "xxx",
					"vat": "2432"
				}
			},
			"Services": {
				"_revenue": "711",
				"_discount": "718",
				"_vat": "24331"
			},
			"Shipping": {
				"_revenue": "721",
				"_vat": "24333"
			},
			"Insurance": {
				"_revenue": "721",
				"_vat": "24333"
			},
			"Customs": {
				"_revenue": "721",
				"_vat": "24333"
			},
			"Payroll": {
				"_expense": "711",
				"_vat": "24331"
			},
			"Supplies": {
				"_expense": "721",
				"_vat": "24333"
			},
			"Rentals&Leases": {
				"_expense": "721",
				"_vat": "24333"
			},
			"Maint&Repair": {
				"_expense": "721",
				"_vat": "24333"
			},
			"Utilities": {
				"_expense": "711",
				"_vat": "24331"
			},
			"Taxes": {
				"_expense": "711",
				"_vat": "24331"
			},
			"Interest": {
				"_expense": "711",
				"_vat": "24331"
			},
			"Travel": {
				"_expense": "721",
				"_vat": "24333"
			},
			"Meals&Entertainment": {
				"_expense": "721",
				"_vat": "24333"
			},
			"Training": {
				"_expense": "721",
				"_vat": "24333"
			}
		},
		"_ledgerAccount": {
				"21": {
					"_description": "Clientes",
					"_acceptsTransactions": false
				},
				"211": {
					"_description": "Clientes C/C",
					"_acceptsTransactions": false
				},
				"2111": {
					"_description": "Clientes Gerais",
					"_acceptsTransactions": true
				}
		},
		"_currency": {
			"EUR": {"_description": "Euro"},
			"USD": {"_description": "US Dollar"},
			"GBP": {"_description": "GB Pound"},
			"CAD": {"_description": "Canadian Dollar"},
			"BRL": {"_description": "Brazilian Real"}
		},
		"_vatClass": {
			"24331": {
				"_description": "IVA Dedutível - Existências",
				"_ledgerAccounts": "24331",
				"_vatClassForReversions": "24341"
			},
			"24332": {
				"_description": "IVA Dedutível - Serviços",
				"_ledgerAccounts": "24332",
				"_vatClassForReversions": "24342"
			}
		},
		"_vatRate": {
			"Standard": {"_description": "Standard VAT rate", "_rate": 0.23},
			"Reduced": {"_description": "Reduced VAT rate", "_rate": 0.06}
		},
		"_cashAccountType": {
			"Cashier": {
				"_ledgerAccount": "11"
			},
			"Bank": {
				"_ledgerAccount": "12"
			}
		},
		"_cashInstruments": {
			"Cash": {"_description": "Notas e moedas"},
			"Cheque": {"_description": "Cheques"}
			},
		"_country": {
			"PT": {"_description": "Portugal"},
			"UK": {"_description": "Reino Unido"}
			},
		"_status": "active",
		"_lastModifiedDate": "2014-07-21T10:37:45Z"
	},
	"_links": {
		"_self": "/5v4080jn/accounting-settings/xyz100ab",
		"_settings": "/5v4080jn/accounting-settings"
	}
};
