import fs from "fs";

let c = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const targetButtons = `<div className="flex items-center gap-2">
                                    <Button 
                                        variant={user.isSuspended ? "default" : "destructive"} 
                                        size="sm"
                                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 shrink-0 transition-transform active:scale-95"
                                        onClick={() => handleToggleSuspension(user.userId, user.isSuspended, user.fullName)}
                                    >
                                        {user.isSuspended ? "Activate" : "Suspend"}
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 shrink-0 transition-transform active:scale-95"
                                        onClick={() => handleDeleteUserAccount(user.userId, user.fullName)}
                                    >
                                        Delete
                                    </Button>
                                </div>`;

const replaceButtons = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto basis-full sm:basis-auto">
                                    <Button 
                                        variant={user.isSuspended ? "default" : "destructive"} 
                                        size="sm"
                                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto"
                                        onClick={() => handleToggleSuspension(user.userId, user.isSuspended, user.fullName)}
                                    >
                                        {user.isSuspended ? "Activate" : "Suspend"}
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4 transition-transform active:scale-95 w-full sm:w-auto"
                                        onClick={() => handleDeleteUserAccount(user.userId, user.fullName)}
                                    >
                                        Delete
                                    </Button>
                                </div>`;

// Replace all occurrences
c = c.split(targetButtons).join(replaceButtons);

const targetContainer = `<div className="flex items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 bg-black/5 dark:bg-white/5 rounded-xl p-3 sm:p-4 border border-black/5 dark:border-white/5 w-full lg:w-auto">`;
const replaceContainer = `<div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 bg-black/5 dark:bg-white/5 rounded-xl p-3 sm:p-4 border border-black/5 dark:border-white/5 w-full lg:w-auto">`;

c = c.split(targetContainer).join(replaceContainer);

fs.writeFileSync('src/pages/AdminDashboard.tsx', c);
