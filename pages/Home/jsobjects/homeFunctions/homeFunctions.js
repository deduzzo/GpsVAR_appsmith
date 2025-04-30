export default {
	userData: null,
	secret: "UxZ>69'[Tu<6",
	distrettiMap: {byUnique: {}, byId: {}},
	periodo: null,
	variabiliInserite: [],
	async initLoad() {
		this.getDistrettiMap();
		this.verifyTokenExpires();
		this.getPeriodo();
		getVariabiliDistretto.run();
	},
	getMeseItaliano: (mese) => {
		let mesi = 'Gennaio_Febbraio_Marzo_Aprile_Maggio_Giugno_Luglio_Agosto_Settembre_Ottobre_Novembre_Dicembre'.split('_');
		return mesi[mese-1];
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
					mail: decoded.data.mail,
					codDistretto: this.distrettiMap.byUnique[decoded.data.id_distretto].old_code
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
	removeRow(hashToRemove) {
    // Filtra l'array rimuovendo l'elemento con il campo hash uguale a hashToRemove
    homeFunctions.variabiliInserite = homeFunctions.variabiliInserite.filter(
      (item) => item.hash !== hashToRemove
    );
  },
	aggiungiVariabile: () => {
		if (!variabileSelezionata.selectedOptionValue || !convenzionatoSelezionato.selectedOptionValue || !importoVariabile.text || importoVariabile.text === ""|| parseFloat(importoVariabile.text) === 0.0) 
			showAlert("Selezionare il convenzionato, il tipo di variabile e l'importo")
		else {
			this.variabiliInserite.push({
				hash: this.getMd5(variabileSelezionata.selectedOptionValue + "_" + convenzionatoSelezionato.selectedOptionValue),
				idVariabile: variabileSelezionata.selectedOptionValue,
				descVariabile: variabileSelezionata.selectedOptionLabel,
				idConvenzionato: convenzionatoSelezionato.selectedOptionValue,
				descConvenzionato: convenzionatoSelezionato.selectedOptionLabel,
				valoreVariabile: parseFloat(importoVariabile.text),
			})
			convenzionatoSelezionato.setSelectedOption("");
			variabileSelezionata.setSelectedOption("");
			importoVariabile.setValue("");
		}
	}
}