const { readdirSync, readFileSync, writeFileSync, rmSync } = require("fs")
const {join, format} = require("path")

const formatUrl = (text) => {
    return text.replaceAll(' ', '-').toLowerCase()
}
const newId = () => {
    return new Date().getTime() - 1680292406980 + (Math.floor(Math.random() * 1000))
}

class Post {
    static id;
    constructor(name = '', date = new Date(), author = '', tags = [], body = '', id) {
        this.name = name,
        this.url_name = formatUrl(name),
        this.date = date,
        this.edited = undefined,
        this.author = author,
        this.tags = tags,
        this.body = body
        this.id = id || newId(),
        this.saved = false
    }
}

class BloggerConfig { 
    constructor(storageDir, template) {
        this.storageDir = storageDir,
        this.template = template,
        this.tagTemplate = undefined,
        this.tagUrl = undefined
    }

    setTagTemplate(i) {
        this.tagTemplate = i
    }
    setTagUrl(i) {
        this.tagUrl = i
    }
}

class Tag {
    static id;
    constructor(name = '', colour, id) {
        this.name = name,
        this.url_name = formatUrl(name)
        this.id = id || newId(),
        this.colour = colour || 'blue', 
        this.saved = false
    }

    getHtml(template, url) {
        return template
                .replace("{URL}", url)
                .replace("{NAME}", this.name)
                .replace("{URL_NAME}", this.url_name)
    }
}

class Blogger {
    constructor(config) {
        this.config = config
        this.posts = [],
        this.tags = []
    }

    // Load the tables from storage
    load() {
        const posts = readdirSync(join(this.config.storageDir, 'posts'))
        this.posts = this.posts.filter(p => p.saved == false)
        for(let file of posts) {
            this.pushPost(this.readPostFromFile(readFileSync(join(this.config.storageDir, 'posts', file)).toString()))
        }

        const tags = readdirSync(join(this.config.storageDir, 'tags'))
        this.tags = this.tags.filter(t => t.saved == false)
        for(let file of tags) {
            this.pushTag(this.readTagFromFile(readFileSync(join(this.config.storageDir, 'tags', file)).toString()))
        }
        return this
    }

    // Save the table to storage
    save() {
        this.posts.forEach(p => {
            // Clone the post then remove useless properties when saving
            const objectToSave = {...p}
            delete objectToSave.saved

            if(p.delete) {
                rmSync(join(this.config.storageDir, p.id.toString())); 
                this.posts = this.posts.filter(post => post.id == p.id);
            }
            else {
                writeFileSync(join(this.config.storageDir, 'posts', p.id.toString()), JSON.stringify(objectToSave))
                p.saved = true
            }
        })

        this.tags.forEach(t => {
            // Clone the post then remove useless properties when saving
            const objectToSave = {...t}
            delete objectToSave.saved
            delete objectToSave.body

            if(t.delete) {
                rmSync(join(this.config.storageDir, 'tags', t.id.toString())); 
                this.posts = this.posts.filter(tag => tag.id == t.id);
            }
            else {
                writeFileSync(join(this.config.storageDir, 'tags', t.id.toString()), `${JSON.stringify(objectToSave)}`)
                t.saved = true
            }
        })
        return this
    }

    // Get the html page for a given post by id
    getPage(id) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const post = this.getPostById(id)

        if(!post || post.delete) return undefined
        const template_html = readFileSync(this.config.template).toString()
    
        const month = months[post.date.getMonth()]
        const day = post.date.getDate();
        const year = post.date.getFullYear();
        const time = `${post.date.getHours()}:${post.date.getMinutes() < 10 ? '0': ''}${post.date.getMinutes()}`    
        
        const tagsHtml = (() => {
            const validTags = post.tags.filter(postTagId => this.tags.find(validTag => validTag.id == postTagId)).map(id => this.getTagById(id))
            return validTags.map(t => t.getHtml(this.config.tagTemplate, this.config.tagUrl)).join('')
        })()

        const html =  template_html
            .replaceAll('{TITLE}', post.name)
            .replaceAll('{AUTHOR}', post.author)
            .replaceAll('{MONTH}', month)
            .replaceAll('{DAY}', day)
            .replaceAll('{YEAR}', year)
            .replaceAll('{TIME}', time)
            .replace('{TAGS}', tagsHtml)
            .replaceAll('{BODY}', post.body)
    
        return html
    }

    // Convert a formatted blog file to a post object
    readPostFromFile(data) {
        const parsed = JSON.parse(data)

        let post =  new Post(parsed.name, new Date(parsed.date), parsed.author, parsed.tags, parsed.body, parsed.id)
        post.edited = parsed.edited || undefined
        return post
    }

    readTagFromFile(data) {
        const parsed = JSON.parse(data)

        let tag = new Tag(parsed.name, parsed.colour, parsed.id)
        return tag
    }

    // Create a new post
    addPost(name, date = new Date(), author, tags = [], body) {
        const newPost = new Post(name, date, author, tags, body)
        this.pushPost(newPost)
        return this
    }

    addTag(name) {
        const newTag = new Tag(name)
        this.pushTag(newTag)
    }

    getPostById(id) {
        return this.posts.find(p => p.id == id)
    }

    getTagById(id) {
        return this.tags.find(t => t.id == id)
    }

    // Get a post from the table based on a query object. By default, results are exclusive, meaning they must meet all criteria in the query object. If inclusive is set to true, a result must only meet one of the criterea to be returned, a dirty get.
    getPosts(query = {}, inclusive=false) {
        const results = []
        for(let key in query) {
            const value = query[key]
            const keyResults = this.posts.filter(p => p[key] == value).filter(p => !p.delete);
            
            if(inclusive == false && keyResults.length == 0) return undefined
            results.push(...keyResults)
        }

        return results
    }

    getTags(query = {}, limit=0, inclusive=false) {
        let results = []
        for(let key in query) {
            const value = query[key]
            const keyResults = this.tags.filter(p => p[key] == value).filter(p => !p.delete);
            
            if(inclusive == false && keyResults.length == 0) return undefined
            results.push(...keyResults)

        }
        return results
    }

    // Remove a post from the table, deletion is cached by state until .save is run
    deletePost(id) {
        const post = this.getPostById(id)
        post.delete = true

        return this
    }

    // Remove a tag from the table
    deleteTag(id) {
        const tag = this.getTagById(id)
        tag.delete = true

        return this
    }

    editTag(id, name) {
        const tag = this.getTagById(id)
        tag.name = name

        return this
    }

    // Add a post to the table
    pushPost(data) {
        if(this.posts.find(o => o.id == data.id)) {  data.id = newId(); this.posts.push(data) }
        else { this.posts.push(data) }
        return this
    }

    // Add a tag to the table
    pushTag(data) {
        if(this.tags.find(o => o.id == data.id)) {  data.id = newId(); this.tags.push(data) }
        else { this.tags.push(data) }
        return this
    }

}

module.exports.BloggerConfig = BloggerConfig
module.exports.Blogger = Blogger
module.exports.Post = Post
module.exports.Tag = Tag