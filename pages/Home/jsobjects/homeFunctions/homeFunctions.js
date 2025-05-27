export default {
	/* =======================
	   VARIABILI DI STATO
	======================= */
	livelli: {
		"100": "SuperAdmin",
		"1": "Utente",
		"2": "Admin Distretto",
		"3": "Amministratore"
	},
	userData: null,
	distrettoCambiato: false,
	secret: "UxZ>69'[Tu<6",
	distrettiMap: { byUnique: {}, byId: {} },
	periodo: null,
	variabiliInserite: [],
	allVariabiliMap: {},
	allConvenzionatiMap: {},
	filtraPerNomeUtente: true,

	/* =======================
	   LOAD INIZIALE
	======================= */
	async initLoad() {
		showModal(caricamentoMdl.name);

		try {
			await this.getDistrettiMap();          // 1
			await this.verifyTokenExpires();       // 2
			await this.getPeriodo();               // 3
			await this.getVariabiliDistretto();    // 4
			await this.getConvenzionatiMap();      // 5
			await getDatiVarDistrettoPeriodo.run(); // 6
		} catch (err) {
			console.error("Errore in initLoad:", err);
			showAlert("Si è verificato un errore nel caricamento iniziale", "error");
		} finally {
			closeModal(caricamentoMdl.name);
		}
	},

	/* =======================
	   AUTENTICAZIONE / LOGOUT
	======================= */
	doLogout: (msg = "Logout effettuato", type = "info") => {
		storeValue("token", null);
		storeValue("message", { msg, type });
		navigateTo("GpsVar Login");
	},

	/* =======================
	   FUNZIONI DI SUPPORTO
	======================= */
	getLast10YearsMap: (currentYear = moment().year()) => {
		let years = [];
		for (let i = 0; i < 10; i++) {
			const year = currentYear - i;
			years.push({ anno: year.toString(), value: year });
		}
		return years;
	},

	aggiornaFiltroTabella: () => {
		this.filtraPerNomeUtente = soloUtenteCorrente.isSwitchedOn;
		getDatiVarDistrettoPeriodo.run();
	},

	getConvenzionatoDescFromId: id => {
		const conv = this.allConvenzionatiMap[id];
		return `(${conv.CI}) ${conv.COGNOME} ${conv.NOME} - [${conv.RAPPORTO}]`;
	},

	dataCompetenzaCongrua: () => {
		const dataPeriodo = moment({ year: this.periodo.anno, month: this.periodo.mese, day: 1 });
		const dataCompetenza = moment({
			year: annoCompetenza.selectedOptionValue,
			month: meseCompetenza.selectedOptionValue,
			day: 1
		});
		return dataCompetenza.isSameOrBefore(dataPeriodo);
	},

	getMesi: () =>
		"Gennaio_Febbraio_Marzo_Aprile_Maggio_Giugno_Luglio_Agosto_Settembre_Ottobre_Novembre_Dicembre".split(
			"_"
		),

	getMesiMap: function () {
		return this.getMesi().map((m, i) => ({ mese: m, value: i + 1 }));
	},

	getMeseItaliano: function (mese) {
		return this.getMesi()[mese - 1];
	},

	/* =======================
	   LOAD DATI DISTRETTO
	======================= */
	async getVariabiliDistretto() {
		this.allVariabiliMap = {};
		await getVariabiliDistretto.run();
		getVariabiliDistretto.data.forEach(v => {
			this.allVariabiliMap[v["#"]] = v;
		});
	},

	async getConvenzionatiMap() {
		this.allConvenzionatiMap = {};
		await getAllConvenzionati.run();
		getAllConvenzionati.data.forEach(c => {
			this.allConvenzionatiMap[c["CI"]] = c;
		});
	},

	async getPeriodo() {
		// se serve aggiornare il dataset, decommenta:
		await getPeriodo.run();
		const periodo = getPeriodo.data;
		this.periodo = periodo.length === 1 ? periodo[0] : null;
	},

	async getDistrettiMap() {
		// se serve aggiornare il dataset, decommenta:
		// await getAllDistretti.run();
		const distretti = getAllDistretti.data || [];
		distretti.forEach(d => {
			this.distrettiMap.byUnique[d.unique] = d;
			this.distrettiMap.byId[d.old_code] = d;
		});
	},

	/* =======================
	   DISTRETTI UTENTE
	======================= */
	getDistrettiFromIds(distrettiString, separator = ",") {
		const ids = distrettiString.split(separator);
		return ids.reduce((acc, id) => {
			const d = this.distrettiMap.byUnique[id];
			if (d) acc[d.old_code] = d.descrizione;
			return acc;
		}, {});
	},

	async cambiaDistrettoSelezionato() {
		this.userData.codDistretto = distrettoSelezionatoCmb.selectedOptionValue.toString();
		this.userData.distretto =
			this.distrettiMap.byId[parseInt(distrettoSelezionatoCmb.selectedOptionValue)].unique;
		this.userData.distrettoTxt =
			this.distrettiMap.byId[this.userData.codDistretto].descrizione;
		this.distrettoCambiato = true;
		closeModal(modalCambioDistretto.name);
		await this.initLoad();
	},

	getDistrettiPossibiliMap() {
		return Object.entries(this.getDistrettiFromIds(this.userData.distrettoRaw)).map(
			([cod, desc]) => ({
				label: desc,
				value: cod
			})
		);
	},

	/* =======================
	   TOKEN / SICUREZZA
	======================= */
	verifyTokenExpires() {
		let expired = false;

		if (appsmith.store.token) {
			try {
				const decoded = jsonwebtoken.verify(appsmith.store.token, this.secret);

				const distretti = this.getDistrettiFromIds(decoded.data.id_distretto);
				this.userData = {
					username: decoded.data.user,
					livelloText: this.livelli[decoded.data.livello.toString()],
					livello: decoded.data.livello,
					mail: decoded.data.mail,
					distrettoRaw: decoded.data.id_distretto,
					// se non è stato cambiato distretto uso il primo, altrimenti mantengo quello selezionato
					codDistretto: this.distrettoCambiato
						? this.userData.codDistretto
						: parseInt(Object.keys(distretti)[0]),
					distretto: this.distrettoCambiato
						? this.userData.distretto
						: this.distrettiMap.byId[Object.keys(distretti)[0]].unique,
					distrettoTxt: this.distrettoCambiato
						? this.userData.distrettoTxt
						: distretti[Object.keys(distretti)[0]]
				};

				const newToken = this.createToken({ data: decoded.data });
				storeValue("token", newToken);
			} catch (err) {
				console.error("Token non valido o scaduto:", err);
				expired = true;
			}
		} else expired = true;

		if (expired) {
			this.doLogout("Sessione scaduta, effettua di nuovo il login", "warning");
		}
		return { expired };
	},

	createToken: user => jsonwebtoken.sign(user, this.secret, { expiresIn: 60 * 60 }),

	/* =======================
	   CSV & PDF
	======================= */
	generaCSV() {
		const mockData = getAllConvenzionati.data;
		return papaparse.unparse(mockData, { header: true, delimiter: ";", newline: "\r\n" });
	},

	scaricaCSV() {
		download(this.generaCSV(), "variabili.csv", "text/csv");
	},

	getValoreCalcolato(row) {
		if (row.altri_valori && row.altri_valori !== "")
			return (
				parseFloat(row.valore) * parseFloat(row.altri_valori) +
				` (${row.valore} * ${row.altri_valori})`
			);
		return row.valore;
	},

	competenzaToString(comp = "2025_04") {
		const [anno, mese] = comp.split("_");
		return `${this.getMeseItaliano(parseInt(mese))} ${anno}`;
	},

	reportDistrettoPDF() {
		const dati = getDatiVarDistrettoPeriodo.data;
		const doc = jspdf.jsPDF();

		/* LOGO */
		const logoWidth = 40;
		const logoHeight = (logoWidth * 100) / 185;
		doc.addImage(resources.logoAsp, "PNG", 210 - logoWidth - 10, 10, logoWidth, logoHeight);

		/* TITOLI */
		doc.setFontSize(18);
		doc.text("Riepilogo variabili distretto", 80, 22, null, null, "center");
		doc.text(this.userData.distrettoTxt, 80, 30, null, null, "center");

		doc.setFontSize(9);
		doc.setTextColor(100);
		doc.text(`Generato il ${moment().format("DD/MM/YYYY HH:mm")}`, 80, 35, null, null, "center");

		/* RAGGRUPPAMENTO DATI */
		const grouped = dati.reduce((acc, el) => {
			if (!acc[el.id_conv]) acc[el.id_conv] = [];
			acc[el.id_conv].push(el);
			return acc;
		}, {});

		const finalData = [];
		Object.keys(grouped)
			.sort((a, b) => a - b)
			.forEach(id_conv => {
				finalData.push([
					{
						content: this.getConvenzionatoDescFromId(id_conv),
						colSpan: 5,
						styles: { halign: "left", fillColor: [220, 220, 220], fontStyle: "bold" }
					}
				]);
				finalData.push([
					{ content: "Voce", styles: { fontSize: 8, fontStyle: "bold" } },
					{ content: "Competenza", styles: { fontSize: 8, fontStyle: "bold" } },
					{ content: "Valore", styles: { fontSize: 8, fontStyle: "bold" } },
					{ content: "Utente", styles: { fontSize: 8, fontStyle: "bold" } },
					{ content: "Data Ora", styles: { fontSize: 8, fontStyle: "bold" } }
				]);
				grouped[id_conv].forEach(item => {
					finalData.push([
						this.allVariabiliMap[item.voce].DESCRIZIONE,
						this.competenzaToString(item.competenza),
						this.getValoreCalcolato(item),
						item.utente,
						item.data_ora
					]);
				});
			});

		jspdf_autotable.autoTable(doc, {
			body: finalData,
			startY: 45,
			theme: "grid",
			styles: { fontSize: 10 },
			headStyles: { fillColor: [0, 0, 128] },
			didDrawPage: data => {
				const pageCount = doc.internal.getNumberOfPages();
				doc.setFontSize(10);
				doc.text(`Pagina ${data.pageNumber} di ${pageCount}`, 200 - 30, 290);
			}
		});

		/* FIRMA */
		const firmaX = doc.internal.pageSize.width - 60;
		const firmaY = doc.internal.pageSize.height - 30;
		doc.setFontSize(12);
		doc.text("Il responsabile", firmaX, firmaY);
		doc.line(firmaX, firmaY + 10, firmaX + 50, firmaY + 10);
		// Genera il nome del file con data e ora corrente
    const timestamp = moment().format("YYYY-MM-DD_HH-mm");
    const filename = `report-${timestamp}.pdf`;
		
				// Salva o restituisci il PDF
		let dataURL = doc.output("dataurlstring");
		// Aggiungi il nome del file come parametro all'URL
    //dataURL += "&filename=" + encodeURIComponent(filename);

    // Restituisci il data URL modificato
    return dataURL;
	},

	/* =======================
	   CRUD VARIABILI
	======================= */
	async removeRow(row) {
		await deleteFromRowIndex.run({ rowIndex: row.rowIndex });
		await getDatiVarDistrettoPeriodo.run();
		showAlert("Riga eliminata, elenco aggiornato.", "info");
	},

	async aggiungiVariabile() {
		if (
			!variabileSelezionata.selectedOptionValue ||
			!convenzionatoSelezionato.selectedOptionValue ||
			!importoVariabile.text ||
			parseFloat(importoVariabile.text) === 0.0
		) {
			showAlert("Selezionare il convenzionato, il tipo di variabile e l'importo");
			return;
		}

		aggiungiVariabile.setDisabled(true);

		await getVarVocePeriodoConv.run();
		if (getVarVocePeriodoConv.data.length !== 0) {
			showAlert(
				"ERRORE! Esiste già lo stesso tipo di variabile per il convenzionato selezionato.",
				"error"
			);
			statusTxt.setText("");
			aggiungiVariabile.setDisabled(
				!convenzionatoSelezionato.selectedOptionValue ||
					!variabileSelezionata.selectedOptionValue ||
					!importoVariabile.text
			);
			return;
		}

		statusTxt.setText("Caricamento in corso... attendere");
		await aggiungiDatiVariabile.run();
		await getDatiVarDistrettoPeriodo.run();

		/* reset form */
		[convenzionatoSelezionato, variabileSelezionata].forEach(cmb => cmb.setSelectedOption(""));
		[importoVariabile, altriDati].forEach(inp => inp.setValue(""));
		meseCompetenza.setSelectedOption(this.periodo.mese);
		annoCompetenza.setSelectedOption(this.periodo.anno);

		statusTxt.setText("");
		showAlert("Variabile inserita correttamente", "info");
	}
};