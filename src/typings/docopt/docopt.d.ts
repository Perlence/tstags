declare module 'docopt' {
    interface DocoptOptions {
        argv?: string[]
        help?: boolean
        version?: string
        options_first?: boolean
        exit?: boolean
    }

    function docopt(doc: string, options?: DocoptOptions): Object
}
