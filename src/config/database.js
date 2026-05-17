const db=require('../models')
const ConnectDB=async () => {
    try {
        await db.sequelize.sync();
        console.log('connected to database');
        
        
    } catch (error) {
        console.error('Unable to connect database',error)
        process.exit(1)
    }
    
}
module.exports=ConnectDB