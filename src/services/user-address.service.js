const { UserAddress } = require("../models");

module.exports = class {
  async create(req, res) {
    try {
      const userAddress = await UserAddress.create({
        ...req.body,
        user_id: req.params.userId,
      });
      res.status(200).send({ data: userAddress });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async createFromAdmin(req, res) {
    try {
      const userAddress = await UserAddress.create(req.body);
      res.status(200).send({ data: userAddress });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }

  async getAllByUserId(req, res) {
    const where = { user_id: req.params.userId };

    const userAddress = await UserAddress.findAll({ where });

    return res.status(200).send({ data: userAddress });
  }

  async updateById(req, res) {
    try{
      let shouldUpdate = true;
      let self = false;

      const where = { id: Number(req.params.id) };

      const address = await UserAddress.findOne({ where });

      if (!address) {
        return res.status(400).send({ message: "Endereço não encontrado" });;
      }
      else{
        if(req.params.userType === 'installer'){
          shouldUpdate = false;
        }
  
        if(req.params.userType === 'user'){
          self = true;
        }
  
        if(shouldUpdate){

          if(self && Number(address.user_id) !== Number(req.params.userId)){
            return res.status(401).send({ message: 'Você não pode fazer isto!' });
          }
          else{
            if(!req.body.hasOwnProperty('user_id') || Number(req.body.user_id) === Number(address.user_id)){
              await UserAddress.update(req.body, { where });

              const newAddress = await UserAddress.findOne({where});
    
              return res.status(200).send({ status: "ok", address: newAddress });
            }
            else{
              return res.status(401).send({ message: 'Você não pode fazer isto!' });
            }
          }
        }
        else{
          return res.status(401).send({ message: 'Você não pode fazer isto!' });
        }
      }
      
    }
    catch(err){
      return res.status(500).send({ message: err.message });
    }
    
  }

  async deleteById(req, res) {
    const where = { id: req.params.id };

    const address = await UserAddress.findOne({ where });

    if (!address || Number(address.user_id) !== Number(req.params.userId)) {
      res.status(400).send({ message: "Endereço não encontrado" });
      return;
    }

    await UserAddress.destroy({ where });

    res.status(200).send({ status: "ok" });
  }
};
