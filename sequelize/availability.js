const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();  
const PORT = 3000;
app.use(express.json());

/*
create a doctor-2 entries
create a doctor availability 2 entries
create a doctor availability_type 2 entries
get doctor avb. by d_id.....use joins
update doctor availability
delete doctor availability and set type
*/

const sequelize = new Sequelize('availability', 'root', 'Test@0115', {
  host: 'localhost',
  dialect: 'mysql',
    logging: false,
});

const Doctor_model = sequelize.define('doctor', {
    d_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,  
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false    
    } 
});

const Availability_model = sequelize.define('availability', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    days : {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false    
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false  
    }  
    ,
    d_id: {
        type: DataTypes.INTEGER,
        allowNull: false,   
    },
    type_id: {
        type: DataTypes.INTEGER,    
        allowNull: false
    }
});

const Availability_type_model = sequelize.define('availability_type', {
    type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false    
    }
}); 

// relations...
Availability_type_model.hasMany(Availability_model, {
    foreignKey: 'type_id',
    as: 'availabilities',
    onDelete: 'CASCADE',
 });
Availability_model.belongsTo(Availability_type_model, {
    foreignKey: 'type_id',
    as: 'availability_type',
  });


// doctor relation....
Doctor_model.hasMany(Availability_model, {
    foreignKey: 'd_id',
    as: 'availabilities',
    onDelete: 'CASCADE'
 });
Availability_model.belongsTo(Doctor_model,{
    foreignKey: 'd_id',
    as: 'doctor',
  });

//create..
app.post('/doctor', async (req, res) => {
    try {
        const doctor = await Doctor_model.create(req.body);
        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//using transaction...rollback and commit
app.post('/transaction/doctor', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const doctor = await Doctor_model.create(req.body, { transaction: t });
        await t.commit();
        res.status(201).json(doctor);
    } catch (error) {
        await t.rollback();
        console.error('Error in transaction:', error);
        res.status(500).json({ error: error.message });
    }
});     

app.post ('/availability_type', async (req, res) => {
    try {
        const availabilityType = await Availability_type_model.create(req.body);
        res.status(201).json(availabilityType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/availability', async (req, res) => {
    try {
        const { days, start_time, end_time, d_id, type_id } = req.body;
        // Validation...
        if (!days || !start_time || !end_time || !d_id || !type_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const availability = await Availability_model.create({ days, start_time, end_time, d_id, type_id });
        res.status(201).json(availability);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/availability', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;      
        const result = await Availability_model.findAndCountAll({
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Doctor_model,
                    as: 'doctor',
                    attributes: ['name']
                },
                {
                    model: Availability_type_model,
                    as: 'availability_type',
                    attributes: ['type']
                }
            ]
        });
        res.json({
            data: result.rows,
            totalItems: result.count,
            currentPage: page,
            totalPages: Math.ceil(result.count / limit)
        });
    } catch (error) {
        console.error('Error in fetching availability:', error);
        res.status(500).json({ error: error.message });
    }
}); 
 
app.get('/availability/:d_id', async (req, res) => {
    try {
        const { d_id } = req.params;
        const availabilities = await Availability_model.findAll({
            where: { d_id },
            include: [
                {
                    model: Doctor_model,
                    as: 'doctor',
                    attributes: ['name']
                },
                {
                    model: Availability_type_model,
                    as: 'availability_type',
                    attributes: ['type']
                }
            ]
        });
        res.status(200).json(availabilities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/availability/:id', async (req, res) => {
    try { 
        const { days, start_time, end_time, d_id, type_id } = req.body;
        const [updated]=await Availability_model.update(
            { days, start_time, end_time, d_id, type_id }, 
           { where: { id: req.params.id }
    });
        if (updated) {
            const updatedAvailability = await Availability_model.findByPk(req.params.id);
            res.status(200).json(updatedAvailability);
        } else {
            res.status(404).json({ error: 'availability not found' });
        }
    } catch (error) {
        console.error('error in updating availability:', error);
        res.status(500).json({ error: error.message });
    }
});


// app.delete('/availability_type/:type_id', async (req, res) => {
//     try {
//         const deleted = await Availability_type_model.destroy({
//             where: { type_id: req.params.type_id }
//         });
//         if (deleted) {
//             res.status(200).json({ message: 'Availability type deleted successfully' });
//         } else {
//             res.status(404).json({ error: 'Availability type not found' });
//         }
//     } catch (error) {
//         console.error('Error in deleting availability type:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

app.delete ('/doctor/:id', async (req, res) => {
    try {
        const deleted = await Doctor_model.destroy({
            where: { d_id: req.params.id }
        });
        if (deleted) {
            res.status(200).json({ message: 'doctor deleted successfully' });
        } else {
            res.status(404).json({ error: 'doctor not found' });
        }
    } catch (error) {
        console.error('Error in deleting doctor:', error);
        res.status(500).json({ error: error.message });
    }
});

async function initDB() {
    try {
        await sequelize.authenticate();
        console.log('database connected successfully!');
        await Doctor_model.sync(); 
        console.log('doctor table synchronized!');
        await Availability_type_model.sync();
        console.log('availability type table synchronized!');
        await Availability_model.sync();
        console.log('availability table synchronized!');
    } catch (error) {
        console.error('database connection failed:', error);
    }
}
 



app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initDB();
});


 