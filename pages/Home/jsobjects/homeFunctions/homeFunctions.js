export default {
	livelli: {
		"100": "SuperAdmin",
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
		this.verifyTokenExpires();
		this.getPeriodo();
		this.getVariabiliDistretto();
		this.getConvenzionatiMap();
		getDatiVarDistrettoPeriodo.run();
	},
	getLast10YearsMap: (currentYear =  moment().get("year")) => {
		console.log(currentYear);
		let years = [];
		for (let i = 0; i < 10; i++) {
			let year = currentYear - i;
			years.push({
				"anno": year.toString(),
				"value": year
			});
		}
		console.log(years)
		return years;
	},
	dataCompetenzaCongrua: () => {
		let dataPeriodo = moment({year: this.periodo.anno, month: this.periodo.mese, day: 1});
		let dataCompetenza = moment({year: annoCompetenza.selectedOptionValue, month: meseCompetenza.selectedOptionValue, day: 1});
		return dataCompetenza.isSameOrBefore(dataPeriodo);
	},
	getMesiMap: () => {
		let mesi = this.getMesi();
		let out = [];
		let i = 1;
		for (let mese of mesi) {
			out.push({"mese": mesi[i-1], "value": i})
			i++;
		}
		console.log(out);
		return out;
	},
	getMesi: () => {
		return 'Gennaio_Febbraio_Marzo_Aprile_Maggio_Giugno_Luglio_Agosto_Settembre_Ottobre_Novembre_Dicembre'.split('_');
	},
	getMeseItaliano: (mese) => {
		let mesi = this.getMesi();
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
		console.log(periodo);
		this.periodo = periodo.length === 0 ||  periodo.length >1  ? null : periodo[0];
	},
	getDistrettiMap: () => {
		let distretti = getAllDistretti.data;
		if (!distretti || distretti.length === 0)
			console.log("NO DISTRETTI");
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
					distrettoTxt: this.distrettiMap.byUnique[decoded.data.id_distretto].descrizione
				}
				const newToken = this.createToken({data: decoded.data});
				console.log("new token");
				console.log(newToken);
				storeValue("token",newToken);
				console.log("token ok");
			} catch (err) {
				console.log("ERRORE")
				console.log(err);
				expired = true;
			}
		}
		else 
			expired = true;
		if (expired) {
			storeValue("token",null);
			//console.log("expired..");
			navigateTo("LoginPage");
			showAlert("asd");
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
	getValoreCalcolato: (row) => {
		console.log(row);
		if (row["altri_valori"] &&  row["altri_valori"] !== "" )
			return (parseFloat(row["valore"]) *  parseFloat(row["altri_valori"])).toString() + " (" + row["valore"] + " * " + row["altri_valori"] + ")";
		else
			return row["valore"]
	},
	scaricaCSV: () => {
		const csv = this.generaCSV();
		console.log(csv);
		download(csv, "assistiti.csv", "text/csv");
	},
	// Funzione per rimuovere una riga dall'array
	removeRow(row) {
		deleteFromRowIndex.run({ rowIndex: row.rowIndex}).then( () => {
			getDatiVarDistrettoPeriodo.run();
			showAlert("Riga eliminata, elenco aggiornato.", "info")
		});
	},
	competenzaToString: (comp = "2025_04") => {
		let splitted = comp.split("_");
		console.log(splitted);
		return this.getMesi()[parseInt(splitted[1])] + " " + splitted[0];
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
						meseCompetenza.setSelectedOption(this.periodo.mese);
						annoCompetenza.setSelectedOption(this.periodo.anno);
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
	},
	reportDistrettoPDF: () => {
		let dati = getDatiVarDistrettoPeriodo.data;
  // Crea il documento
  const doc = jspdf.jsPDF();

  // Logo fittizio (rettangolo grigio con testo)
  doc.setFillColor(200, 200, 200);
  doc.rect(10, 10, 30, 20, 'F');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("LOGO", 15, 23);

  // Titolo
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text("Export variabili", 105, 25, null, null, 'center');

  // Data
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Generato il " + moment().format("DD/MM/YYYY HH:mm"), 105, 33, null, null, 'center');

  // Raggruppa per convenzionato (id_conv)
  const grouped = {};
  dati.forEach(item => {
    if (!grouped[item.id_conv]) grouped[item.id_conv] = [];
    grouped[item.id_conv].push(item);
  });

  // Ordina per convenzionato
  const convenzionati = Object.keys(grouped).sort((a, b) => a - b);

  let finalData = [];
  convenzionati.forEach(id_conv => {
    // Intestazione convenzionato
    finalData.push([
      {content: `Convenzionato: ${id_conv}`, colSpan: 6, styles: { halign: 'left', fillColor: [220, 220, 220] }}
    ]);
    // Intestazione colonne
    finalData.push([
      {content: 'Voce', styles: { fontSize: 10 }},
      {content: 'Competenza', styles: { fontSize: 10 }},
      {content: 'Valore', styles: { fontSize: 10 }},
      {content: 'Utente', styles: { fontSize: 10 }},
      {content: 'Data Ora', styles: { fontSize: 10 }}
    ]);
    // Dati
    grouped[id_conv].forEach(item => {
      finalData.push([
        item.voce,
        item.competenza,
        item.valore.toString(),
        item.utente,
        item.data_ora
      ]);
    });
  });

  // Tabella
  jspdf_autotable.autoTable(doc, {
    body: finalData,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 0, 128] },
    didDrawPage: function (data) {
      // Numero pagina
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(`Pagina ${data.pageNumber} di ${pageCount}`, 200 - 30, 290);
    }
  });

  // Salva o restituisci il PDF
  return doc.output("dataurlstring");
}
}