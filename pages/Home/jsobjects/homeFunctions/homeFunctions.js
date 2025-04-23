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
}