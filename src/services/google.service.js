const axios = require('axios');
const haversine = require('haversine');

module.exports = class {
    async getAddress(req, res) {

        const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input='+encodeURI(req.body.address)+'&key='+process.env.GOOGLE_API_KEY;

        const config = {
            method: 'get',
            url: url,
            headers: { }
        };
          
        axios(config)
        .then((response) => {
            if(response.data.status === 'OK'){
                return res.status(200).send({data : response.data});
            }
            else{
                return res.status(500).send('Ocorreu um erro ao consultar a API do google.');
            }
        })
        .catch((error) => {
            return res.status(500).send({error : error});
        });
    }

    async getLatLong(req, res) {

        const url = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURI(req.body.address)+'&key='+process.env.GOOGLE_API_KEY;

        const config = {
            method: 'get',
            url: url,
            headers: { }
        };
          
        axios(config)
        .then((response) => {
            if(response.data.status === 'OK'){
                return res.status(200).send({data : response.data});
            }
            else{
                return res.status(500).send('Ocorreu um erro ao consultar a API do google.');
            }
        })
        .catch((error) => {
            return res.status(500).send({error : error});
        });
    }

    async getLatLongService(address) {

        const url = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURI(address)+'&key='+process.env.GOOGLE_API_KEY;

        const config = {
            method: 'get',
            url: url,
            headers: { }
        };

        try{
            const response = await axios(config);
            if(response.data.status === 'OK'){
                return response;
            }
            else{
                return false;
            }
        }
        catch(err){
            return false;
        }

        
    }

    async getDistance(req,res) {
        try{
            const distance = haversine(req.body.start, req.body.end);
            if(distance){
                return res.status(200).send({distance: distance});
            }
            else{
                return res.status(400).send({message: "Bad request!"});
            }
        }
        catch(error){
            return res.status(500).send({error: error});
        }
    }
};
  