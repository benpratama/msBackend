const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ! Blueprint collection User di mongodb
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role_id: {type:mongoose.ObjectId, required: true},
    created_at: { type: String, required: true },
    created_by: { type: String, required: true },
    isDeleted: { type:Boolean},
    deleted_at: { type: String}
},{ versionKey: false });

// ! pertama dia encrypt dulu passwordnya trs baru jalanin save
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10); // ! ini passwordnya diencrypt
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);