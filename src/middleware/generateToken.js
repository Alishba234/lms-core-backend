const jwt=require('jsonwebtoken')
const generateToken=(user)=>{
      if (!user || !user.id) {
    throw new Error("Invalid user object");
  }

    const token=jwt.sign({id:user.id,role:user.role},process.env.JWT_SECRET,{
        expiresIn:"7d"
    })
    return token
}
module.exports={generateToken}