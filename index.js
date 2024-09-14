const express = require('express');
const cors = require('cors')
const pool = require('./db.js');
const app = express();

app.use(express.json());
app.use(cors());
i = 0

app.get('/', (req, res)=>{
  i++
  res.send({numero: i})
})

app.post('/categoria', async (req, res) => {
  try {
    const { id_categoria, nome_categoria } = req.body;

    const categoriaExistente = await pool.query(
      'SELECT * FROM categoria WHERE id_categoria = $1 AND nome_categoria = $2',
      [id_categoria, nome_categoria]
    );
    
    if (categoriaExistente.rows.length > 0) {
      return res.status(400).json({ error: 'A categoria já está cadastrada.' });
    }
    const novaCategoria = await pool.query(
      'INSERT INTO categoria (id_categoria, nome_categoria) VALUES ($1, $2) RETURNING *',
      [id_categoria, nome_categoria]
    );
    res.status(200).json(novaCategoria.rows[0])
  } catch (err) {
      if(err == "duplicar valor da chave viola a restrição de unicidade \"pk_categoria\""){
        console.log(err)
      }
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

app.get("/categoria", async (req,res) => {
  try{
    const todasCategorias = await pool.query(
      'SELECT * FROM categoria'
    );
    res.status(200).json(todasCategorias.rows)
  }catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
  
})

app.post('/musica', async (req, res) => {
  try {
    const { nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria } = req.body;
    
    const musicaExistente = await pool.query(
      'SELECT * FROM musica WHERE nome_musica = $1 AND nome_artista = $2 AND link_youtube_musica = $3',
      [nome_musica, nome_artista, link_youtube_musica]
    );
    console.log(musicaExistente)
    console.log("AAAAAAAAAAAAAA")
    if (musicaExistente.rows.length > 0) {
      return res.status(400).json({ error: 'A música já está cadastrada.' });
    }
    const novaMusica = await pool.query(
      'INSERT INTO musica (nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria]
    );
    console.log(novaMusica)
    console.log("AAAAAAAAAAAAAA")
    res.status(200).json(novaMusica.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

app.get('/setlist', async (req, res) => {
  try {
    const idsString = req.query.id_categoria;
    if (!idsString) {
      return res.status(400).send('ID de categoria não fornecido');
    }

    const idsArray = idsString.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (idsArray.length === 0) {
      return res.status(400).send('Nenhum ID de categoria válido fornecido');
    }

    const unicos = [];
    const idsUnicos = new Set();
    let consultasRestantes = 10; 

    while (unicos.length < 10 && consultasRestantes > 0) {
      const consultas = idsArray.map(async (numeroCategoria) => {
        const query = `
          SELECT * FROM musica 
          WHERE fk_musica_categoria = ${numeroCategoria}
          ORDER BY RANDOM() LIMIT 1
        `;
        const resultado = await pool.query(query);
        return resultado.rows[0]; 
      });
      const resultados = await Promise.all(consultas);

      resultados.forEach(musica => {
        if (musica && !idsUnicos.has(musica.id_musica) && unicos.length < 10) {
          idsUnicos.add(musica.id_musica);
          unicos.push(musica);
        }
      });

      consultasRestantes--;
    }

    if (unicos.length < 10) {
      return res.status(400).send('Não foi possível encontrar 10 músicas únicas.');
    }

    res.status(200).send(unicos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});






const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
