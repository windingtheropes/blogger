import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'fs'
import { join } from "path"

const formatUrl = (text) => {
    return text.replaceAll(' ', '-').toLowerCase()
}
const newId = () => {
    return new Date().getTime() - 1680292406980 + (Math.floor(Math.random() * 1000)).toString()
}

export class BloggerError extends Error {
    constructor(message) {
        super(message);
        this.name = "BloggerError";
    }
}

export class BloggerObject {
    constructor(name, id = newId()) {
        this.name = name;
        this.url_name = formatUrl(name);
        this.id = id;
        this.saved = false;
    }

    edit(edits) {
        const notAllowed = ['url_name', 'saved', 'id']
        for(let e in edits) {
            if(notAllowed.find(n => n == e)) continue
            const edit = edits[e]

            this[e] = edit
        }
    }
}

export class Author extends BloggerObject {
    constructor(name, bio, id) {
        super(name, id);
        this.bio = bio
    }
}

export class Post extends BloggerObject {
    constructor(name, date = new Date(), author, tags = [], body, description, id) {
        super(name, id);
        this.author = author;
        this.date = date;
        this.tags = tags;
        this.description = description;
        this.body = body;
        this.edited = null;
        this.public = false
    }
}

export class Tag extends BloggerObject {
    constructor(name, description, colour = 'blue', id) {
        super(name, id);
        this.description = description;
        this.colour = colour
    }
}

export class Blogger {
    constructor(storageDir = './blog') {
        this.storageDir = storageDir,
            this.posts = [],
            this.tags = [],
            this.authors = []
    }
    #checkDirectoryStructure() {
        if (!existsSync(join(this.storageDir, 'authors'))) { mkdirSync(join(this.storageDir, 'authors')) }
        if (!existsSync(join(this.storageDir, 'posts'))) { mkdirSync(join(this.storageDir, 'posts')) }
        if (!existsSync(join(this.storageDir, 'tags'))) { mkdirSync(join(this.storageDir, 'tags')) }
    }
    // Load the tables from storage
    load() {
        this.#checkDirectoryStructure()
        const posts = readdirSync(join(this.storageDir, 'posts'))
        this.posts = this.posts.filter(p => p.saved == false)
        for (let file of posts) {
            this.pushPost(this.readPostFromFile(readFileSync(join(this.storageDir, 'posts', file)).toString()))
        }

        const tags = readdirSync(join(this.storageDir, 'tags'))
        this.tags = this.tags.filter(t => t.saved == false)
        for (let file of tags) {
            this.pushTag(this.readTagFromFile(readFileSync(join(this.storageDir, 'tags', file)).toString()))
        }

        const authors = readdirSync(join(this.storageDir, 'authors'))
        this.authors = this.authors.filter(a => a.saved == false)
        for (let file of authors) {
            this.pushAuthor(this.readAuthorFromFile(readFileSync(join(this.storageDir, 'authors', file)).toString()))
        }
        return this
    }

    // Save the table to storage
    save() {
        this.#checkDirectoryStructure()
        this.posts.forEach(p => {
            // Clone the post then remove useless properties when saving
            const objectToSave = { ...p }
            delete objectToSave.saved
            delete objectToSave.url_name

            if (p.delete) {
                rmSync(join(this.storageDir, p.id.toString()));
                this.posts = this.posts.filter(post => post.id == p.id);
            }
            else {
                writeFileSync(join(this.storageDir, 'posts', p.id.toString()), JSON.stringify(objectToSave))
                p.saved = true
            }
        })

        this.tags.forEach(t => {
            // Clone the post then remove useless properties when saving
            const objectToSave = { ...t }
            delete objectToSave.saved
            delete objectToSave.url_name

            if (t.delete) {
                rmSync(join(this.storageDir, 'tags', t.id.toString()));
                this.posts = this.posts.filter(tag => tag.id == t.id);
            }
            else {
                writeFileSync(join(this.storageDir, 'tags', t.id.toString()), `${JSON.stringify(objectToSave)}`)
                t.saved = true
            }
        })

        this.authors.forEach(a => {
            // Clone the post then remove useless properties when saving
            const objectToSave = { ...a }
            delete objectToSave.saved
            delete objectToSave.url_name

            if (a.delete) {
                rmSync(join(this.storageDir, 'authors', a.id.toString()));
                this.posts = this.posts.filter(author => author.id == a.id);
            }
            else {
                writeFileSync(join(this.storageDir, 'authors', a.id.toString()), `${JSON.stringify(objectToSave)}`)
                a.saved = true
            }
        })
        return this
    }

    // Convert a formatted blog file to a post object
    readPostFromFile(data) {
        const parsed = JSON.parse(data)

        let post = new Post(parsed.name, new Date(parsed.date), parsed.author, parsed.tags, parsed.body, parsed.description, parsed.id)
        post.edited = parsed.edited || undefined
        return post
    }

    readTagFromFile(data) {
        const parsed = JSON.parse(data)

        let tag = new Tag(parsed.name, parsed.description, parsed.colour, parsed.id)
        return tag
    }

    readAuthorFromFile(data) {
        const parsed = JSON.parse(data)

        let author = new Author(parsed.name, parsed.bio, parsed.id)
        return author
    }

    // Create a new post
    addPost(name, date = new Date(), author, tags = [], body, description) {
        const newPost = new Post(name, date, author, tags, body, description)
        if (!name && name == '') throw new BloggerError("Name cannot be empty.")
        if (this.posts.find(p => p.url_name == newPost.url_name)) throw new BloggerError("Author name already exists.")
        this.pushPost(newPost)
        return this
    }

    addTag(name, description, colour) {
        const newTag = new Tag(name, description, colour)
        if (!name && name == '') throw new BloggerError("Name cannot be empty.")
        if (this.tags.find(t => t.url_name == newTag.url_name)) throw new BloggerError("Author name already exists.")
        this.pushTag(newTag)
        return this
    }

    addAuthor(name, bio) {
        const newAuthor = new Author(name, bio)
        if (!name && name == '') throw new BloggerError("Name cannot be empty.")
        if (this.authors.find(a => a.url_name == newAuthor.url_name)) throw new BloggerError("Author name already exists.")
        this.pushAuthor(newAuthor)
        return this
    }

    getPosts() {
        return this.posts
    }

    getTags() {
        return this.tags
    }

    deletePost(id) {
        const post = this.posts.find(p => p.id == id)
        post.delete = true

        return this
    }

    // Remove a tag from the table
    deleteTag(id) {
        const tag = this.tags.find(t => t.id == id)
        tag.delete = true

        return this
    }

    deleteAuthor(id) {
        const author = this.authors.find(a => a.id == id)
        author.delete = true

        return this
    }

    editTag(id, name) {
        const tag = this.getTagById(id)
        tag.name = name

        return this
    }

    // Add a post to the table
    pushPost(data) {
        if (this.posts.find(o => o.id == data.id)) { data.id = newId(); this.posts.push(data) }
        else { this.posts.push(data) }
        return this
    }

    // Add a tag to the table
    pushTag(data) {
        if (this.tags.find(o => o.id == data.id)) { data.id = newId(); this.tags.push(data) }
        else { this.tags.push(data) }
        return this
    }

    // Add an author to the table
    pushAuthor(data) {
        if (this.authors.find(o => o.id == data.id)) { data.id = newId(); this.authors.push(data) }
        else { this.authors.push(data) }
        return this
    }

}