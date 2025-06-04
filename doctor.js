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

const Doctor_avalability = sequelize.define('doctor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clinic_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    day_of_week: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,  
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_avalable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    indexes: [
        {
            unique: true,
            name: 'unique_doctor_schedule',
            fields: ['clinic_id', 'user_id', 'date', 'start_time', 'end_time']
        }
    ]
});

async function initDB() {
    try {
        await sequelize.authenticate();
        console.log('database connected successfully!');
        await Doctor_avalability.sync(); 
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

        // if start time is before end time
        if (new Date(`1970-01-01T${start_time}`) >= new Date(`1970-01-01T${end_time}`)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        const overlapping = await Doctor_avalability.findOne({
            where: {
                clinic_id,
                user_id,
                date,
                [Sequelize.Op.or]: [
                    {
                        start_time: { [Sequelize.Op.lt]: end_time },
                        end_time: { [Sequelize.Op.gt]: start_time }
                    },
                    {
                        start_time: { [Sequelize.Op.gte]: start_time, [Sequelize.Op.lt]: end_time }
                    },
                    {
                        end_time: { [Sequelize.Op.gt]: start_time, [Sequelize.Op.lte]: end_time }
                    }
                ]
            }
        });

        if (overlapping) {
            return res.status(409).json({ 
                error: 'time overlapping: doctor already has appointment or leave during this time',
                conflictingEntry: overlapping
            });
        }

        const newDoctor = await Doctor_avalability.create({
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
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ 
                error: 'duplicate entry: doctor already has this exact time slot scheduled',
                details: error.errors.map(err => err.message)
            });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// app.get('/api/doctors', async (req, res) => {
//     try {
//         const doctors = await Doctor_avalability.findAll();
//         res.status(200).json(doctors);
//     }
app.get('/api/doctors/:id', async (req, res) => {
    try {
         const doctor = await Doctor_avalability.findByPk(req.params.id);
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
        const is_avalable = type === 'leave' ? false : true;
        
        // Validation..
        if (!clinic_id || !user_id || !day_of_week || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // if start time is before end time
        if (new Date(`1970-01-01T${start_time}`) >= new Date(`1970-01-01T${end_time}`)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        const overlapping = await Doctor_avalability.findOne({
            where: {
                clinic_id,
                user_id,
                date,
                id: { [Sequelize.Op.ne]: req.params.id }, 
                [Sequelize.Op.or]: [
                    {
                        start_time: { [Sequelize.Op.lt]: end_time },
                        end_time: { [Sequelize.Op.gt]: start_time }
                    },
                    {
                        start_time: { [Sequelize.Op.gte]: start_time, [Sequelize.Op.lt]: end_time }
                    },
                    {
                        end_time: { [Sequelize.Op.gt]: start_time, [Sequelize.Op.lte]: end_time }
                    }
                ]
            }
        });

        if (overlapping) {
            return res.status(409).json({ 
                error: 'time overlapping: doctor already has appointment or leave during this time',
                conflictingEntry: overlapping
            });
        }

        const [updated] = await Doctor_avalability.update({
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
            const updatedDoctor = await Doctor_avalability.findByPk(req.params.id);
            res.status(200).json(updatedDoctor);
        } else {
            res.status(404).json({ error: 'Doctor not found' });
        }
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/api/doctors/:id', async (req, res) => {
    try {
        const deletedCount = await Doctor_avalability.destroy({
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
 