require('dotenv').config()
const express = require('express')
const app = express()
const port = process.env.PORT

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/smit', (req , res) => {
    res.send('Hey Smit keep up the good work')
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})