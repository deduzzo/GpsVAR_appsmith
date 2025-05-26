export default {
	livelli: {
		"-1": "SuperAdmin",
		"1": "Utente",
		"2": "Admin Distretto",
		"3": "Amministratore"
	},
	userData: null,
	secret: "UxZ>69'[Tu<6",
	distrettiMap: {byUnique: {}, byId: {}},
	periodo: null,
	variabiliInserite: [],
	allVariabiliMap: {},
	allConvenzionatiMap: {},
	async initLoad() {
		this.getDistrettiMap();
		//this.verifyTokenExpires();
		this.getPeriodo();
		this.getVariabiliDistretto();
		this.getConvenzionatiMap();
		getDatiVarDistrettoPeriodo.run();
	},
	getMeseItaliano: (mese) => {
		let mesi = 'Gennaio_Febbraio_Marzo_Aprile_Maggio_Giugno_Luglio_Agosto_Settembre_Ottobre_Novembre_Dicembre'.split('_');
		return mesi[mese-1];
	},
	getVariabiliDistretto: () => {
		this.allVariabiliMap = {};
		let variabili = getVariabiliDistretto.run().then( () => {
			for (let variabile of getVariabiliDistretto.data) {
				this.allVariabiliMap[variabile['#']] = variabile;
			}
		});
	},
	getConvenzionatiMap: () => {
		this.allConvenzionatiMap = {};
		let convenzionati = getAllConvenzionati.run().then( () => {
			for (let convenzionato of getAllConvenzionati.data) {
				this.allConvenzionatiMap[convenzionato['CI']] = convenzionato;
			}
		});
	},
	getPeriodo: () => {
		let periodo = getPeriodo.data;
		this.periodo = periodo.length === 0 ||  periodo.length >1  ? null : periodo[0];
	},
	getDistrettiMap: () => {
		let distretti = getAllDistretti.data;
		console.log(distretti)
		for (let distretto of distretti) {
			this.distrettiMap.byUnique[distretto.unique] = distretto;
			this.distrettiMap.byId[distretto.old_code] = distretto;
		}
	},
	getMd5: (data) => {
		return crypto_js.MD5(data).toString();
	},
	verifyTokenExpires: () => {
		let expired = false;
		//console.log(appsmith.store.token);
		if (appsmith.store.token !== null) {
			try {
				const decoded = jsonwebtoken.verify(appsmith.store.token, this.secret);
				console.log("decoded:");
				console.log(decoded);
				this.userData = {
					username: decoded.data.user, 
					distretto: decoded.data.id_distretto,
					livelloText: this.livelli[decoded.data.livello.toString()],
					livello: decoded.data.livello,
					mail: decoded.data.mail,
					codDistretto: this.distrettiMap.byUnique[decoded.data.id_distretto].old_code,
					distrettoTxt: this.distrettiMap.byUnique[this.userData.distretto].descrizione
				}
				const newToken = this.createToken({data: decoded.data});
				//console.log("new token");
				//console.log(newToken);
				storeValue("token",newToken);
				//console.log("token ok");
			} catch (err) {
				console.log(err);
				expired = true;
			}
		}
		else 
			expired = true;
		if (expired) {
			storeValue("token",null);
			console.log("expired..");
			navigateTo("LoginPage");
		}
		return {expired}

	},
	createToken: (user) => {
		return jsonwebtoken.sign(user, this.secret, {expiresIn: 60*60});
	},
	doReport: () => {
		this.scaricaCSV();
	},
	generaCSV: () => {
		let mockData = getAllConvenzionati.data;
		const csv = papaparse.unparse(mockData, {
			header: true, // questa opzione è di default, ma puoi specificarla
			delimiter: ";", // puoi cambiare il delimitatore se vuoi
			newline: "\r\n"
		});

		// Ora "csv" è una stringa CSV con la prima riga come header
		return csv;
	},
	scaricaCSV: () => {
		const csv = this.generaCSV();
		console.log(csv);
		download(csv, "assistiti.csv", "text/csv");
	},
	// Funzione per rimuovere una riga dall'array
	removeRow(row) {
		console.log(row);
		deleteFromRowIndex.run({ rowIndex: row.rowIndex}).then( () => {
			getDatiVarDistrettoPeriodo.run();
			showAlert("Riga eliminata, elenco aggiornato.", "info")
		});
	},
	aggiungiVariabile: () => {
		if (!variabileSelezionata.selectedOptionValue || !convenzionatoSelezionato.selectedOptionValue || !importoVariabile.text || importoVariabile.text === ""|| parseFloat(importoVariabile.text) === 0.0) 
			showAlert("Selezionare il convenzionato, il tipo di variabile e l'importo")
		else {
			aggiungiVariabile.setDisabled(true);
			getVarVocePeriodoConv.run().then(() => {
				if (getVarVocePeriodoConv.data.length === 0) {
					statusTxt.setText("Caricamento in corso.. attendere");

					aggiungiDatiVariabile.run().then( () => {
						getDatiVarDistrettoPeriodo.run();
						convenzionatoSelezionato.setSelectedOption("");
						variabileSelezionata.setSelectedOption("");
						importoVariabile.setValue("");
						altriDati.setValue("");
						statusTxt.setText("");
						showAlert("Variabile inserita correttamente","info");
					})
				}
				else {
					showAlert("ERRORE! Esiste già lo stesso tipo di variabile per il convenzionato selezionato. Se il valore non è corretto è necessario eliminare quella già presente e reinserirla.","error");
					statusTxt.setText("");
					aggiungiVariabile.setDisabled(!convenzionatoSelezionato.selectedOptionValue || !variabileSelezionata.selectedOptionValue || !importoVariabile.text || importoVariabile.text=== "" || !homeFunctions.periodo || (altriDati.isVisible && (altriDati.text === "" || !altriDati.text)));
				}
			});
		}
	}
}