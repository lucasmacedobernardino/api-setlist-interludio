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

    if (musicaExistente.rows.length > 0) {
      return res.status(400).json({ error: 'A música já está cadastrada.' });
    }
    const novaMusica = await pool.query(
      'INSERT INTO musica (nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria]
    );
    res.status(200).json(novaMusica.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

// Rota para obter músicas por categorias selecionadas
app.get('/setlist', async (req, res) => {
  try {
    const idsString = req.query.id_categoria;
    if (!idsString) {
      return res.status(400).send('ID de categoria não fornecido');
    }

    const idsArray = idsString.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    console.log(idsArray)
    if (idsArray.length === 0) {
      return res.status(400).send('Nenhum ID de categoria válido fornecido');
    }
    let arrayMusicas = []

    // Mapeia as consultas em um array de promessas
    const consultas = idsArray.map(async (numeroCategoria, index) => {
      console.log("NUMERO CATEGORIA: ", numeroCategoria, "\n")
      const query = `
      SELECT * FROM musica 
      WHERE fk_musica_categoria = ${numeroCategoria}
      ORDER BY RANDOM() LIMIT 1
      `
      const resultado = await pool.query(query)
      return resultado.rows[0] // Retorna apenas a primeira linha
    })

    // Aguarda todas as consultas serem concluídas
    const resultados = await Promise.all(consultas)

    res.status(200).send(resultados)
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});





const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
