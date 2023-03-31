const { readdirSync, readFileSync, writeFileSync, write } = require("fs")
const {join} = require("path")

class Post {
    constructor(name = '', date = new Date(), author = '', tags = [], body = '', id) {
        this.name = name,
        this.url_name = this.formatUrl(name),
        this.date = date,
        this.edited = undefined,
        this.author = author,
        this.tags = tags,
        this.body = body
        this.id = id,
        this.saved = false
    }

    // Get a urlsafe name
    formatUrl(text) {
        return text.replaceAll(' ', '-').toLowerCase()
    }
}

class Blogger {
    #posts;
    constructor(storageDir, template) {
        this.storageDir = storageDir,
        this.template = template,
        this.#posts = []
    }

    // Load the post table from storage
    load() {
        const children = readdirSync(this.storageDir)
        this.#posts = this.#posts.filter(p => p.saved == false)
        for(let file of children) {
            this.pushPost(this.readPostFromFile(readFileSync(join(this.storageDir, file)).toString()))
        }
        return this
    }

    // Save the table to storage
    save() {
        this.#posts.forEach(p => {
            const body = p.body

            // Clone the post then remove useless properties when saving
            const objectToSave = {...p}
            delete objectToSave.saved
            delete objectToSave.body

            // save the file, and note it as so in the table
            writeFileSync(join(this.storageDir, p.id.toString()), `${JSON.stringify(p)}\n${body}`)
            p.saved = true
        })
        return this
    }

    // Get the html page for a given post by id
    getPage(id) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const post = this.getPost(id)

        if(!post) return undefined
        const template_html = readFileSync(this.template).toString()
    
        const month = months[post.date.getMonth()]
        const day = post.date.getDate();
        const year = post.date.getFullYear();
        const time = `${post.date.getHours()}:${post.date.getMinutes() < 10 ? '0': ''}${post.date.getMinutes()}`    
    
        const html =  template_html
            .replaceAll('{TITLE}', post.name)
            .replaceAll('{AUTHOR}', post.author)
            .replaceAll('{MONTH}', month)
            .replaceAll('{DAY}', day)
            .replaceAll('{YEAR}', year)
            .replaceAll('{TIME}', time)
            .replaceAll('{BODY}', post.body)
    
        return html
    }

    // Convert a formatted blog file to a post object
    readPostFromFile(data) {
        const lines = data.split('\n')
        const metadata = JSON.parse(lines[0])
        const body = lines.filter((v, i) => i !== 0).join('\n')
        let post =  new Post(metadata.name, new Date(metadata.date), metadata.author, metadata.tags, body, metadata.id)
        post.edited = metadata.edited || undefined
        return post
    }

    // Create a new post
    addPost(name, date = new Date(), author, tags = [], body) {
        const newPost = new Post(name, date, author, tags, body, this.newId())
        this.pushPost(newPost)
        return this
    }

    // Gets a new, unused id for creating a new post
    newId() {
        return Math.max(0, ...this.#posts.map(p => p.id)) + 1
    }

    // Get a post from the table given an id
    getPost(id) {
        return this.#posts.find(p => p.id == id)
    }

    // Edit a post from the table
    editPost(newData) {
        const {id} = newData

        const post = this.getPost(id)

        if(!post) return

        let newPost = newData
        newPost.date = post.date
        newPost.edited = new Date()
        newPost.saved = false

        this.pushPost(newPost, true)
    }

    // Add a post to the table
    pushPost(data, overwrite=false) {
        if(this.#posts.find(o => o.id == data.id) && !overwrite) {  data.id = this.newId(); this.#posts.push(data) }
        else { this.#posts.push(data) }
        return this
    }

    // Get the references (name and id) for all posts
    getReferences() {
        return this.#posts.map(p => ({id: p.id, name: p.url_name}))
    }
}

module.exports.Blogger = Blogger
module.exports.Post = Post