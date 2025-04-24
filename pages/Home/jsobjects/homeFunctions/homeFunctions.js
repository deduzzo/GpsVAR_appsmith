export default {
		userData: null,
	distretto: 40,
	async initLoad() {
			this.verifyTokenExpires();
		},
		verifyTokenExpires: () => {
		let expired = false;
		console.log(appsmith.store.token);
		if (appsmith.store.token !== null) {
			try {
				const decoded = jsonwebtoken.verify(appsmith.store.token, this.secret);
				//console.log("decoded:");
				//console.log(decoded);
				this.userData = {
					username: decoded.data.user, 
					distretto: decoded.data.id_distretto,
					mail: decoded.data.mail
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
			navigateTo("Login");
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
  }
}