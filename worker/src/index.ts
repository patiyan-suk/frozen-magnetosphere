import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'

type Bindings = {
    DB: D1Database
    BUCKET: R2Bucket
    JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => {
    return c.text('Farm Management API')
})

// Public endpoint for serving images from R2
app.get('/api/images/:key', async (c) => {
    try {
        const imageKey = c.req.param('key')

        const object = await c.env.BUCKET.get(imageKey)

        if (!object) {
            return c.json({ error: 'Image not found' }, 404)
        }

        // Return the image with appropriate content type
        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to fetch image' }, 500)
    }
})

// Auth Middleware
const authMiddleware = async (c: any, next: any) => {
    const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET || 'fallback-secret' })
    return jwtMiddleware(c, next)
}

// POST /api/auth/register
app.post('/api/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json()
        if (!username || !password) return c.json({ error: 'Missing fields' }, 400)

        const hashedPassword = await bcrypt.hash(password, 10)

        try {
            const result = await c.env.DB.prepare(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)'
            ).bind(username, hashedPassword).run()
            return c.json({ success: true, id: result.meta.last_row_id }, 201)
        } catch (e) {
            return c.json({ error: 'Username already exists' }, 409)
        }
    } catch (e) {
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// POST /api/auth/login
app.post('/api/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json()
        const user = await c.env.DB.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(username).first()

        if (!user || !await bcrypt.compare(password, user.password_hash as string)) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        const token = await sign({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, c.env.JWT_SECRET || 'fallback-secret')
        return c.json({ token, user: { id: user.id, username: user.username } })
    } catch (e) {
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// Protected Routes
app.use('/api/sales/*', authMiddleware)
app.use('/api/notes/*', authMiddleware)
app.use('/api/expenses/*', authMiddleware)
app.use('/api/upload', authMiddleware)

// POST /api/sales - Add a new sale record
app.post('/api/sales', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        const body = await c.req.parseBody()
        const image = body['image'] as File
        const date = body['date'] as string
        const weight = parseFloat(body['weight'] as string)
        const pricePerKg = parseFloat(body['pricePerKg'] as string)
        const customer = body['customer'] as string

        if (!image || !date || isNaN(weight) || isNaN(pricePerKg) || !customer) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const totalPrice = weight * pricePerKg // weight is in kg
        const imageKey = `${Date.now()}-${image.name}`

        // Upload image to R2
        await c.env.BUCKET.put(imageKey, image)

        // Save record to D1
        const result = await c.env.DB.prepare(
            `INSERT INTO sales (user_id, date, weight_kg, price_per_kg, total_price, customer_name, image_key) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(userId, date, weight, pricePerKg, totalPrice, customer, imageKey)
            .run()

        return c.json({ success: true, id: result.meta.last_row_id })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error', details: String(e) }, 500)
    }
})

// GET /api/sales/summary - Get sales summary
app.get('/api/sales/summary', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        // Daily Summary (Today)
        const today = new Date().toISOString().split('T')[0]
        const daily = await c.env.DB.prepare(
            `SELECT SUM(total_price) as total_sales, SUM(weight_kg) as total_weight FROM sales WHERE user_id = ? AND date = ?`
        ).bind(userId, today).first()

        // Monthly Summary (Current Month)
        const currentMonth = today.substring(0, 7) // YYYY-MM
        const monthly = await c.env.DB.prepare(
            `SELECT SUM(total_price) as total_sales, SUM(weight_kg) as total_weight FROM sales WHERE user_id = ? AND date LIKE ?`
        ).bind(userId, `${currentMonth}%`).first()

        // Yearly Summary (Current Year)
        const currentYear = today.substring(0, 4) // YYYY
        const yearly = await c.env.DB.prepare(
            `SELECT SUM(total_price) as total_sales, SUM(weight_kg) as total_weight FROM sales WHERE user_id = ? AND date LIKE ?`
        ).bind(userId, `${currentYear}%`).first()

        // All Time Summary
        const allTime = await c.env.DB.prepare(
            `SELECT SUM(total_price) as total_sales, SUM(weight_kg) as total_weight FROM sales WHERE user_id = ?`
        ).bind(userId).first()

        return c.json({
            daily: daily || { total_sales: 0, total_weight: 0 },
            monthly: monthly || { total_sales: 0, total_weight: 0 },
            yearly: yearly || { total_sales: 0, total_weight: 0 },
            allTime: allTime || { total_sales: 0, total_weight: 0 }
        })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/sales - List recent sales
app.get('/api/sales', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        const { results } = await c.env.DB.prepare(
            `SELECT * FROM sales WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 20`
        ).bind(userId).all()
        return c.json(results)
    } catch (e) {
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/sales/:id - Get a single sale by ID
app.get('/api/sales/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const saleId = c.req.param('id')

        const sale = await c.env.DB.prepare(
            `SELECT * FROM sales WHERE id = ? AND user_id = ?`
        ).bind(saleId, userId).first()

        if (!sale) {
            return c.json({ error: 'Sale not found' }, 404)
        }

        return c.json(sale)
    } catch (e) {
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// DELETE /api/sales/:id - Delete a sale record
app.delete('/api/sales/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const saleId = c.req.param('id')

        // First, check if the sale exists and belongs to the user
        const sale = await c.env.DB.prepare(
            `SELECT * FROM sales WHERE id = ? AND user_id = ?`
        ).bind(saleId, userId).first()

        if (!sale) {
            return c.json({ error: 'Sale not found' }, 404)
        }

        // Delete the image from R2 if it exists
        if (sale.image_key) {
            await c.env.BUCKET.delete(sale.image_key as string)
        }

        // Delete the record from D1
        await c.env.DB.prepare(
            `DELETE FROM sales WHERE id = ? AND user_id = ?`
        ).bind(saleId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// PUT /api/sales/:id - Update a sale record
app.put('/api/sales/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const saleId = c.req.param('id')

        // Check if the sale exists and belongs to the user
        const existingSale = await c.env.DB.prepare(
            `SELECT * FROM sales WHERE id = ? AND user_id = ?`
        ).bind(saleId, userId).first()

        if (!existingSale) {
            return c.json({ error: 'Sale not found' }, 404)
        }

        const body = await c.req.parseBody()
        const image = body['image'] as File | undefined
        const date = body['date'] as string
        const weight = parseFloat(body['weight'] as string)
        const pricePerKg = parseFloat(body['pricePerKg'] as string)
        const customer = body['customer'] as string

        if (!date || isNaN(weight) || isNaN(pricePerKg) || !customer) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const totalPrice = weight * pricePerKg
        let imageKey = existingSale.image_key as string

        // If a new image is uploaded, replace the old one
        if (image && image.size > 0) {
            // Delete old image if it exists
            if (existingSale.image_key) {
                await c.env.BUCKET.delete(existingSale.image_key as string)
            }
            // Upload new image
            imageKey = `${Date.now()}-${image.name}`
            await c.env.BUCKET.put(imageKey, image)
        }

        // Update the record in D1
        await c.env.DB.prepare(
            `UPDATE sales SET date = ?, weight_kg = ?, price_per_kg = ?, total_price = ?, customer_name = ?, image_key = ? WHERE id = ? AND user_id = ?`
        ).bind(date, weight, pricePerKg, totalPrice, customer, imageKey, saleId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error', details: String(e) }, 500)
    }
})

// ========== NOTES ENDPOINTS ==========

// POST /api/notes - Create a new note
app.post('/api/notes', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const { title, content, date } = await c.req.json()

        if (!title || !content || !date) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const result = await c.env.DB.prepare(
            `INSERT INTO notes (user_id, title, content, date) VALUES (?, ?, ?, ?)`
        ).bind(userId, title, content, date).run()

        return c.json({ success: true, id: result.meta.last_row_id }, 201)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/notes - List all notes for the user
app.get('/api/notes', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        const { results } = await c.env.DB.prepare(
            `SELECT * FROM notes WHERE user_id = ? ORDER BY date DESC, created_at DESC`
        ).bind(userId).all()

        return c.json(results)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/notes/search?q=keyword - Search notes by keyword
app.get('/api/notes/search', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const query = c.req.query('q') || ''

        if (!query) {
            return c.json([])
        }

        const searchPattern = `%${query}%`
        const { results } = await c.env.DB.prepare(
            `SELECT * FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY date DESC, created_at DESC`
        ).bind(userId, searchPattern, searchPattern).all()

        return c.json(results)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/notes/:id - Get a single note
app.get('/api/notes/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const noteId = c.req.param('id')

        const note = await c.env.DB.prepare(
            `SELECT * FROM notes WHERE id = ? AND user_id = ?`
        ).bind(noteId, userId).first()

        if (!note) {
            return c.json({ error: 'Note not found' }, 404)
        }

        return c.json(note)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// PUT /api/notes/:id - Update a note
app.put('/api/notes/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const noteId = c.req.param('id')
        const { title, content, date } = await c.req.json()

        if (!title || !content || !date) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Check if note exists and belongs to user
        const existingNote = await c.env.DB.prepare(
            `SELECT * FROM notes WHERE id = ? AND user_id = ?`
        ).bind(noteId, userId).first()

        if (!existingNote) {
            return c.json({ error: 'Note not found' }, 404)
        }

        // Update the note
        await c.env.DB.prepare(
            `UPDATE notes SET title = ?, content = ?, date = ?, updated_at = strftime('%s', 'now') WHERE id = ? AND user_id = ?`
        ).bind(title, content, date, noteId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// DELETE /api/notes/:id - Delete a note
app.delete('/api/notes/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const noteId = c.req.param('id')

        // Check if note exists and belongs to user
        const note = await c.env.DB.prepare(
            `SELECT * FROM notes WHERE id = ? AND user_id = ?`
        ).bind(noteId, userId).first()

        if (!note) {
            return c.json({ error: 'Note not found' }, 404)
        }

        // Delete the note
        await c.env.DB.prepare(
            `DELETE FROM notes WHERE id = ? AND user_id = ?`
        ).bind(noteId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})



// POST /api/upload - Generic image upload
app.post('/api/upload', async (c) => {
    try {
        const payload = c.get('jwtPayload') // Ensure authenticated
        const body = await c.req.parseBody()
        const image = body['image'] as File

        if (!image) {
            return c.json({ error: 'No image provided' }, 400)
        }

        const imageKey = `note-${Date.now()}-${image.name}`
        await c.env.BUCKET.put(imageKey, image)

        const imageUrl = `https://farm-management-worker.jsa-app.workers.dev/api/images/${imageKey}`
        return c.json({ url: imageUrl })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Upload failed' }, 500)
    }
})

// ========== EXPENSES ENDPOINTS ==========

// GET /api/expenses/summary - Get expenses summary
app.get('/api/expenses/summary', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        // Daily Summary (Today)
        const today = new Date().toISOString().split('T')[0]
        const daily = await c.env.DB.prepare(
            `SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = ? AND date = ?`
        ).bind(userId, today).first()

        // Monthly Summary (Current Month)
        const currentMonth = today.substring(0, 7) // YYYY-MM
        const monthly = await c.env.DB.prepare(
            `SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = ? AND date LIKE ?`
        ).bind(userId, `${currentMonth}%`).first()

        // Yearly Summary (Current Year)
        const currentYear = today.substring(0, 4) // YYYY
        const yearly = await c.env.DB.prepare(
            `SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = ? AND date LIKE ?`
        ).bind(userId, `${currentYear}%`).first()

        // All Time Summary
        const allTime = await c.env.DB.prepare(
            `SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = ?`
        ).bind(userId).first()

        return c.json({
            daily: daily || { total_expenses: 0 },
            monthly: monthly || { total_expenses: 0 },
            yearly: yearly || { total_expenses: 0 },
            allTime: allTime || { total_expenses: 0 }
        })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// POST /api/expenses - Create a new expense
app.post('/api/expenses', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const { date, itemName, amount, category } = await c.req.json()

        if (!date || !itemName || !amount) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const result = await c.env.DB.prepare(
            `INSERT INTO expenses (user_id, date, item_name, amount, category) VALUES (?, ?, ?, ?, ?)`
        ).bind(userId, date, itemName, amount, category).run()

        return c.json({ success: true, id: result.meta.last_row_id }, 201)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// GET /api/expenses - List all expenses for the user
app.get('/api/expenses', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id

        const { results } = await c.env.DB.prepare(
            `SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC`
        ).bind(userId).all()

        return c.json(results)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// PUT /api/expenses/:id - Update an expense
app.put('/api/expenses/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const expenseId = c.req.param('id')
        const { date, itemName, amount, category } = await c.req.json()

        if (!date || !itemName || !amount) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Check if expense exists and belongs to user
        const existingExpense = await c.env.DB.prepare(
            `SELECT * FROM expenses WHERE id = ? AND user_id = ?`
        ).bind(expenseId, userId).first()

        if (!existingExpense) {
            return c.json({ error: 'Expense not found' }, 404)
        }

        // Update the expense
        await c.env.DB.prepare(
            `UPDATE expenses SET date = ?, item_name = ?, amount = ?, category = ? WHERE id = ? AND user_id = ?`
        ).bind(date, itemName, amount, category, expenseId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// DELETE /api/expenses/:id - Delete an expense
app.delete('/api/expenses/:id', async (c) => {
    try {
        const payload = c.get('jwtPayload')
        const userId = payload.id
        const expenseId = c.req.param('id')

        // Check if expense exists and belongs to user
        const expense = await c.env.DB.prepare(
            `SELECT * FROM expenses WHERE id = ? AND user_id = ?`
        ).bind(expenseId, userId).first()

        if (!expense) {
            return c.json({ error: 'Expense not found' }, 404)
        }

        // Delete the expense
        await c.env.DB.prepare(
            `DELETE FROM expenses WHERE id = ? AND user_id = ?`
        ).bind(expenseId, userId).run()

        return c.json({ success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

export default app
