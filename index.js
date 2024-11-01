const express = require('express');
const cors = require('cors');
const pool = require('./db.js');
const app = express();

app.use(express.json());
app.use(cors());

i = 0;

app.get('/', (req, res) => {
  i++;
  res.send({ numero: i });
});

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
    res.status(200).json(novaCategoria.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

app.get('/categoria', async (req, res) => {
  try {
    const todasCategorias = await pool.query('SELECT * FROM categoria');
    res.status(200).json(todasCategorias.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

app.put('/musica/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria } = req.body;

    const updateMusica = await pool.query(
      'UPDATE musica SET nome_musica = $1, nome_artista = $2, link_youtube_musica = $3, fk_musica_categoria = $4 WHERE id_musica = $5 RETURNING *',
      [nome_musica, nome_artista, link_youtube_musica, fk_musica_categoria, id]
    );

    if (updateMusica.rows.length === 0) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    res.status(200).json({ message: 'Música atualizada com sucesso', musica: updateMusica.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao atualizar a música');
  }
});

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

app.delete('/musica/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteMusica = await pool.query('DELETE FROM musica WHERE id_musica = $1 RETURNING *', [id]);

    if (deleteMusica.rows.length === 0) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    res.status(200).json({ message: 'Música deletada com sucesso', musica: deleteMusica.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao deletar a música');
  }
});


app.get('/setlist', async (req, res) => {
  try {
    const idsString = req.query.id_categoria;
    if (!idsString) {
      return res.status(400).send('ID de categoria não fornecido');
    }

    const idsArray = idsString.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
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

      resultados.forEach((musica) => {
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

// Nova rota para listar categorias com suas músicas
app.get('/categorias-com-musicas', async (req, res) => {
  try {
    const query = `
      SELECT c.nome_categoria, m.id_musica, m.nome_musica
      FROM categoria c
      LEFT JOIN musica m ON c.id_categoria = m.fk_musica_categoria
      ORDER BY c.nome_categoria, m.nome_musica
    `;
    const { rows } = await pool.query(query);

    // Organizar os dados por categoria
    const categoriasComMusicas = rows.reduce((acc, row) => {
      const { nome_categoria, id_musica, nome_musica } = row;

      let categoria = acc.find((c) => c.categoria === nome_categoria);

      if (!categoria) {
        categoria = { categoria: nome_categoria, musicas: [] };
        acc.push(categoria);
      }

      if (id_musica && nome_musica) {
        categoria.musicas.push({ id_musica, nome_musica });
      }

      return acc;
    }, []);

    res.status(200).json(categoriasComMusicas);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar categorias e músicas.');
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
