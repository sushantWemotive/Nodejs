const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();  
const PORT = 3000;
app.use(express.json());

const sequelize = new Sequelize('test', 'root', 'Test@0115', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

const Doctor = sequelize.define('doctor', {
    id : 
    {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clinic_id: 
    {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: 
    {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: 
    {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    day_of_week: 
    {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    date: 
    {
        type: DataTypes.DATE,
        allowNull: false
    },
    start_time: 
    {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: 
    {
        type: DataTypes.TIME,
        allowNull: false
    },
    description : 
    {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_avalable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

async function initDB() {
    try {
        await sequelize.authenticate();
        console.log('database connected successfully!');
        await Doctor.sync(); 
        console.log('doctor table synchronized!');
    } catch (error) {
        console.error('database connection failed:', error);
    }
}

app.post('/api/doctors', async (req, res) => {
    try {
        const { clinic_id, user_id, type, day_of_week, date, start_time, end_time, description } = req.body;
        const is_avalable = type === 'leave' ? false : true;
        // Validation..
        if (!clinic_id || !user_id || !day_of_week || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const duplicate = await Doctor.findOne({
            where: {
                clinic_id,
                user_id,
                type,
                day_of_week,
                date,
                start_time,
                end_time
            }
        });
        if (duplicate) {
            return res.status(409).json({ error: 'Duplicate entry: Doctor with these details already exists' });
        }

        const newDoctor = await Doctor.create({
            clinic_id,
            user_id,
            type,
            day_of_week,
            date,
            start_time,
            end_time,
            description,
            is_avalable
        });
        res.status(201).json(newDoctor);
    } catch (error) {
        console.error('Error creating doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    };
});

// app.get('/api/doctors', async (req, res) => {
//     try {
//         const doctors = await Doctor.findAll();
//         res.status(200).json(doctors);
//     }
app.get('/api/doctors/:id', async (req, res) => {
    try {
         const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.status(200).json(doctor);
    } catch (error) {
        console.error('Error fetching doctor by id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/doctors/:id', async (req, res) => {
    try {
        const { clinic_id, user_id, type, day_of_week, date, start_time, end_time, description } = req.body;
        // Validation..
        if (!clinic_id || !user_id || !day_of_week || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const is_avalable = type === 'leave' ? false : true;

        const [updated] = await Doctor.update({
            clinic_id,
            user_id,
            type,
            day_of_week,
            date,
            start_time,
            end_time,
            description,
            is_avalable
        }, {
            where: { id: req.params.id }
        });

        if (updated) {
            const updatedDoctor = await Doctor.findByPk(req.params.id);
            res.status(200).json(updatedDoctor);
        } else {
            res.status(404).json({ error: 'Doctor not found' });
        }
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
);

app.delete('/api/doctors/:id', async (req, res) => {
    try {
        const deletedCount = await Doctor.destroy({
            where: { id: req.params.id }
        });
         if (deletedCount === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
         res.json({ message: 'Doctor deleted successfully' });   
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initDB();
});
 
