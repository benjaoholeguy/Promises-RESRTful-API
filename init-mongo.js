db.createUser({
    user: "root",
    password: "root",
    roles: [
        {
            role: "readWrite",
            db: "db_maspiscolas"
        }
    ]
})