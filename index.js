import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'fs'
import { format, join } from "path"

export const formatUrl = (text) => {
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
        this.delete = false;
    }
    delete() {
        this.delete = true
    }
    edit(edits) {
        const ignore = ['saved', 'id', 'url_name']
        for (let e in edits) {
            if(ignore.find(i => i == e)) continue

            const edit = edits[e]
            if(edit !== undefined && edit !== '' && this[e]) {
                this[e] = edit
            }
        }
        this.url_name = formatUrl(this.name)
        this.edited = new Date()
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
        this.published = true;
        this.edited = null;
    }
}

export class Tag extends BloggerObject {
    constructor(name, description, colour = 'blue', id) {
        super(name, id);
        this.description = description;
        this.colour = colour
    }
}

export class BloggerTable {
    _content = [];
    childType

    constructor (childType, storageDir) {
        this.childType = childType
        this.storageDir = storageDir
    }

    get content() {
        return this._content.filter(o => o.delete == false)
    }

    push(data) {
        if(!data instanceof this.childType) throw new BloggerError("Data does not match childType.")
        if (this._content.find(o => o.id == data.id)) { data.id = newId(); this._content.push(data) }
        else { this._content.push(data) }
        return this
    }
}

export class PostsTable extends BloggerTable {
    constructor (storageDir) {
        super(Post, storageDir)
    }

    readFromJson(data) {
        const parsed = JSON.parse(data)

        let post = new Post(parsed.name, new Date(parsed.date), parsed.author, parsed.tags, parsed.body, parsed.description, parsed.id)
        post.edited = parsed.edited || undefined
        return post
    }

    addPost(data) {
        if(!data instanceof this.childType) throw new BloggerError("Data does not match childType.")
        if (!data.name || data.name == '') throw new BloggerError("Name cannot be empty.")
        if (this._content.find(p => p.url_name == data.url_name)) throw new BloggerError("Post name already exists.")
        this.push(data)
        return this
    }

    editPost(id, edits) {
        const post = this._content.find(p=> p.id == id)
        if(!post) return
        if (edits.name == '') throw new BloggerError("Name cannot be empty.");
        if(edits.name && this._content.find(p=>p.url_name == formatUrl(edits.name))) throw new BloggerError("Post name already exists.") 
        post.edit(edits)
    }

    _load() {
        const posts = readdirSync(join(this.storageDir, 'posts'))
        this._content = this._content.filter(p => p.saved == false)
        for (let file of posts) {
            this.push(this.readFromJson(readFileSync(join(this.storageDir, 'posts', file)).toString()))
        }
    }

    _save() {
        this._content.forEach(p => {
            // Clone the post then remove useless properties when saving
            const objectToSave = { ...p }
            delete objectToSave.saved
            delete objectToSave.url_name
            delete objectToSave.delete

            if (p.delete) {
                rmSync(join(this.storageDir, p.id.toString()));
                this._content = this._content.filter(post => post.id !== p.id);
            }
            else {
                writeFileSync(join(this.storageDir, 'posts', p.id.toString()), JSON.stringify(objectToSave))
                p.saved = true
            }
        })
    }
}

export class TagsTable extends BloggerTable {
    constructor (storageDir) {
        super(Tag, storageDir)
    }

    readFromJson(data) {
        const parsed = JSON.parse(data)

        let tag = new Tag(parsed.name, parsed.description, parsed.colour, parsed.id)
        return tag
    }

    addPost(data) {
        if(!data instanceof this.childType) throw new BloggerError("Data does not match childType.")
        if (!data.name || data.name == '') throw new BloggerError("Name cannot be empty.")
        if (this._content.find(p => p.url_name == data.url_name)) throw new BloggerError("Post name already exists.")
        this.push(data)
        return this
    }

    editTag(id, edits) {
        const tag = this._content.find(t=> t.id == id)
        if (edits.name == '') throw new BloggerError("Name cannot be empty.");
        if(edits.name && this._content.find(t=>t.url_name == formatUrl(edits.name))) throw new BloggerError("Tag name already exists.") 
        tag.edit(edits)
    }

    _load() {
        const tags = readdirSync(join(this.storageDir, 'tags'))
        this._content = this._content.filter(t => t.saved == false)
        for (let file of tags) {
            this._content.push(this.readFromJson(readFileSync(join(this.storageDir, 'tags', file)).toString()))
        }
    }

    _save() {
        this._content.forEach(t => {
            // Clone the post then remove useless properties when saving
            const objectToSave = { ...t }
            delete objectToSave.saved
            delete objectToSave.url_name
            delete objectToSave.delete

            if (t.delete) {
                rmSync(join(this.storageDir, 'tags', t.id.toString()));
                this.posts = this._content.filter(tag => tag.id != t.id);
            }
            else {
                writeFileSync(join(this.storageDir, 'tags', t.id.toString()), `${JSON.stringify(objectToSave)}`)
                t.saved = true
            }
        })
    }
}

export class AuthorsTable extends BloggerTable {
    constructor (storageDir) {
        super(Author, storageDir)
    }

    readFromJson(data) {
        const parsed = JSON.parse(data)

        let author = new Author(parsed.name, parsed.bio, parsed.id)
        return author
    }

    addAuthor(data) {
        if(!data instanceof this.childType) throw new BloggerError("Data does not match childType.")
        if (!data.name && data.name == '') throw new BloggerError("Name cannot be empty.")
        if (this._content.find(a => a.url_name == data.url_name)) throw new BloggerError("Author name already exists.")
        this.push(data)
        return this
    }

    editAuthor(id, edits) {
        const author = this._content.find(a=> a.id == id)
        if (edits.name == '') throw new BloggerError("Name cannot be empty.");
        if(edits.name && this._content.find(t=>t.url_name == formatUrl(edits.name))) throw new BloggerError("Author name already exists.") 
        author.edit(edits)
    }

    _load() {
        const authors = readdirSync(join(this.storageDir, 'authors'))
        this._content = this._content.filter(a => a.saved == false)
        for (let file of authors) {
            this._content.push(this.readFromJson(readFileSync(join(this.storageDir, 'authors', file)).toString()))
        }
    }

    _save() {
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
    }
}

export class Blogger {
    posts;
    tags;
    authors;

    constructor(storageDir = './blog') {
        this.storageDir = storageDir,
            this.posts = new PostsTable(this.storageDir),
            this.tags = new TagsTable(this.storageDir),
            this.authors = new AuthorsTable(this.storageDir)
        }
    #checkDirectoryStructure() {
        if (!existsSync(join(this.storageDir, 'authors'))) { mkdirSync(join(this.storageDir, 'authors')) }
        if (!existsSync(join(this.storageDir, 'posts'))) { mkdirSync(join(this.storageDir, 'posts')) }
        if (!existsSync(join(this.storageDir, 'tags'))) { mkdirSync(join(this.storageDir, 'tags')) }
    }
    // Load the tables from storage
    load() {
        this.#checkDirectoryStructure()
        this.posts._load()
        this.tags._load()
        this.authors._load()

        return this
    }
    
    // Save the table to storage
    save() {
        this.#checkDirectoryStructure()
        
        this.posts._save()

        return this
    }
}

