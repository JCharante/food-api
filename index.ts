import express from 'express';

require('dotenv').config({ path: '.env.local' })
const app = express();

let adminTokenObtained = false
let adminToken = ''

const getAdminToken = async (): Promise<string> => {
    if (!adminTokenObtained) {
        const res = await fetch('http://127.0.0.1:8090/api/admins/auth-via-email', {
            method: 'POST',
            body: JSON.stringify({ 'email': process.env.PB_EMAIL, 'password': process.env.PB_PASSWORD }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        console.log(res)
        const { token } = await res.json()
        console.log(token)
        adminToken = token
        adminTokenObtained = true
    }
    return adminToken
}

app.get('/', (req, res) => {
    res.send('This is a test web page!');
})

app.get('/restaurants', async (req, res) => {
    const token = await getAdminToken()
    res.send(token)
})

app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
})
