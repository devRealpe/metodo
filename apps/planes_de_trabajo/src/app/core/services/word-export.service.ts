import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    BorderStyle,
    AlignmentType,
    Header,
    Footer,
    ImageRun,
    PageNumber,
    VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import {
    PlanDeTrabajoCompleto,
    ProfesorData,

    ActividadData,
    AsignaturaData,
    InvestigacionData
} from './pdf-export.service';

@Injectable({
    providedIn: 'root'
})
export class WordExportService {
    private logoBase64: string | null = null;

    private readonly FONT_FAMILY = 'Arial';
    private readonly FONT_SIZE_TITLE = 10 * 2;
    private readonly FONT_SIZE_HEADER = 9 * 2;
    private readonly FONT_SIZE_NORMAL = 8 * 2;
    private readonly FONT_SIZE_SMALL = 7 * 2;
    private readonly FONT_SIZE_TABLE = 6.5 * 2;

    private readonly COLOR_HEADER_BG = 'DCDCDC';
    private readonly COLOR_ROW_ALT = 'F0F0F0';
    private readonly COLOR_BLACK = '000000';
    private readonly COLOR_GRAY_TEXT = '646464';

    constructor(private http: HttpClient) { }

    private async cargarLogo(): Promise<ArrayBuffer | null> {
        try {

            const response = await this.http.get('/assets/images/Escudo_Unimar.png', { responseType: 'arraybuffer' }).toPromise();
            return response || null;
        } catch (error) {
            return null;
        }
    }

    async exportarPTIndividual(planCompleto: PlanDeTrabajoCompleto): Promise<void> {
        const logoBuffer = await this.cargarLogo();

        const sections = [];

        let tituloPlan = '';
        switch (planCompleto.profesor.rol) {
            case 'Dir': tituloPlan = 'DIRECTOR'; break;
            case 'Ast': tituloPlan = 'ASISTENTE ACADÉMICO'; break;
            case 'Prof': default: tituloPlan = 'PROFESOR'; break;
        }

        const tableHeader = this.crearTablaCabecera(planCompleto);

        const tableProfesor = this.crearTablaDatosProfesor(planCompleto, tituloPlan);

        const seccionesDoc: (Paragraph | Table)[] = [];

        const seccionesFiltradas = planCompleto.secciones
            .map(seccionPadre => ({
                ...seccionPadre,
                hijos: seccionPadre.hijos.filter(hijo => hijo.totalHoras > 0)
            }))
            .filter(seccionPadre => seccionPadre.hijos.length > 0 && seccionPadre.totalHoras > 0);

        seccionesFiltradas.forEach((seccionPadre, index) => {
            seccionesDoc.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${index + 1}. ${seccionPadre.nombre.toUpperCase()}`,
                            bold: true,
                            font: this.FONT_FAMILY,
                            size: this.FONT_SIZE_NORMAL,
                            color: this.COLOR_BLACK
                        })
                    ],
                    spacing: { before: 300, after: 200 }
                })
            );

            seccionPadre.hijos.forEach(seccionHijo => {
                seccionesDoc.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: seccionHijo.nombre.toUpperCase(),
                                bold: true,
                                font: this.FONT_FAMILY,
                                size: this.FONT_SIZE_SMALL,
                                color: this.COLOR_GRAY_TEXT
                            })
                        ],
                        spacing: { before: 150, after: 50 }
                    })
                );

                if (seccionHijo.tipo === 'asignaturas' && seccionHijo.asignaturas) {
                    seccionesDoc.push(this.renderizarTablaAsignaturas(seccionHijo.asignaturas));
                } else if (seccionHijo.tipo === 'investigacion' && seccionHijo.investigaciones) {
                    seccionesDoc.push(this.renderizarTablaInvestigaciones(seccionHijo.investigaciones));
                } else if (seccionHijo.tipo === 'actividades' && seccionHijo.actividades) {
                    seccionesDoc.push(this.renderizarTablaActividades(seccionHijo.actividades));
                }

                seccionesDoc.push(new Paragraph({ spacing: { after: 50 } }));

                seccionesDoc.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({ text: "SUBTOTAL", bold: true, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })],
                                            alignment: AlignmentType.LEFT
                                        })],
                                        shading: { fill: this.COLOR_HEADER_BG },
                                        width: { size: 85, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({ text: `${seccionHijo.totalHoras} HORAS`, bold: true, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })],
                                            alignment: AlignmentType.RIGHT
                                        })],
                                        shading: { fill: this.COLOR_HEADER_BG },
                                        width: { size: 15, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                    })
                                ]
                            })
                        ],
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                            left: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                            right: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
                        }
                    })
                );

                seccionesDoc.push(new Paragraph({ spacing: { after: 100 } }));
            });

            seccionesDoc.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: `TOTAL ${seccionPadre.nombre.toUpperCase()}`, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                                        alignment: AlignmentType.LEFT
                                    })],
                                    shading: { fill: this.COLOR_HEADER_BG },
                                    width: { size: 85, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: `${seccionPadre.totalHoras} HORAS`, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                                        alignment: AlignmentType.RIGHT
                                    })],
                                    shading: { fill: this.COLOR_HEADER_BG },
                                    width: { size: 15, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                })
                            ]
                        })
                    ],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
                    }
                })
            );
            seccionesDoc.push(new Paragraph({ spacing: { after: 200 } }));
        });

        const totalGeneralTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: "TOTAL HORAS PLAN DE TRABAJO PROFESOR", bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                                alignment: AlignmentType.LEFT
                            })],
                            shading: { fill: this.COLOR_HEADER_BG },
                            width: { size: 85, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 50, bottom: 50, left: 100, right: 100 }
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: `${planCompleto.totalHoras} HORAS`, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                                alignment: AlignmentType.RIGHT
                            })],
                            shading: { fill: this.COLOR_HEADER_BG },
                            width: { size: 15, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            margins: { top: 50, bottom: 50, left: 100, right: 100 }
                        })
                    ]
                })
            ],
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
            }
        });

        const firmasTable = this.crearSeccionFirmas(planCompleto);

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 850,
                            bottom: 850,
                            left: 850,
                            right: 850
                        }
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            this.crearEncabezadoLogo(logoBuffer),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "UNIVERSIDAD MARIANA", bold: true, font: this.FONT_FAMILY, size: this.FONT_SIZE_HEADER }),
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "VICERRECTORÍA ACADÉMICA", font: this.FONT_FAMILY, size: this.FONT_SIZE_NORMAL }),
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `PLAN DE TRABAJO ${tituloPlan} PROGRAMA ACADÉMICO`, font: this.FONT_FAMILY, size: this.FONT_SIZE_HEADER }),
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200 }
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Universidad Mariana - Sistema de Planes de Trabajo", size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })
                                ],
                                alignment: AlignmentType.CENTER
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `Generado: ${new Date().toLocaleString('es-CO')} - Página `, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: this.FONT_SIZE_SMALL,
                                        font: this.FONT_FAMILY
                                    }),
                                    new TextRun({ text: " de ", size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY }),
                                    new TextRun({
                                        children: [PageNumber.TOTAL_PAGES],
                                        size: this.FONT_SIZE_SMALL,
                                        font: this.FONT_FAMILY
                                    })
                                ],
                                alignment: AlignmentType.CENTER
                            })
                        ]
                    })
                },
                children: [
                    tableHeader,
                    new Paragraph({ spacing: { after: 200 } }),
                    new Paragraph({
                        children: [new TextRun({
                            text: `DATOS DE IDENTIFICACIÓN DEL ${tituloPlan === 'DIRECTOR' ? 'DIRECTOR DEL PROGRAMA' : (tituloPlan === 'ASISTENTE ACADÉMICO' ? 'ASISTENTE ACADÉMICO DEL PROGRAMA' : 'PROFESOR DEL PROGRAMA')}`,
                            bold: true,
                            size: this.FONT_SIZE_NORMAL,
                            font: this.FONT_FAMILY
                        })],
                        spacing: { after: 100 }
                    }),
                    tableProfesor,
                    new Paragraph({ spacing: { after: 200 } }),
                    ...seccionesDoc,
                    new Paragraph({ spacing: { after: 200 } }),
                    totalGeneralTable,
                    new Paragraph({ spacing: { after: 400 } }),
                    new Paragraph({
                        children: [new TextRun({ text: "FIRMAS:", bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                        spacing: { before: 400, after: 100 }
                    }),
                    firmasTable,
                    new Paragraph({
                        children: [
                            new TextRun({ text: "FECHA:\t", bold: true, size: this.FONT_SIZE_HEADER, font: this.FONT_FAMILY }),
                            new TextRun({ text: new Date().toLocaleDateString('es-CO'), font: this.FONT_FAMILY, size: this.FONT_SIZE_HEADER })
                        ],
                        tabStops: [
                            { type: "left", position: 1500 }
                        ],
                        spacing: { before: 200 }
                    })
                ]
            }]
        });

        const buffer = await Packer.toBlob(doc);
        const fileName = `PT_${planCompleto.profesor.nombres.replace(/\s+/g, '_')}_${planCompleto.profesor.apellidos.replace(/\s+/g, '_')}_${planCompleto.periodo}.docx`;
        saveAs(buffer, fileName);
    }

    private crearEncabezadoLogo(logoBuffer: ArrayBuffer | null): Paragraph {
        if (logoBuffer) {
            return new Paragraph({
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 70, height: 35 },
                        type: 'png',
                    })
                ],
                alignment: AlignmentType.RIGHT
            });
        }
        return new Paragraph({});
    }

    private crearTablaCabecera(plan: PlanDeTrabajoCompleto): Table {
        const w1 = 25;
        const w2 = 8.5;
        const w3 = 22;
        const w4 = 44.5;

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        this.createHeaderLabelCell("AÑO", w1),
                        this.createHeaderValueCell(plan.anio.toString(), w2),
                        this.createHeaderLabelCell("FACULTAD", w3),
                        this.createHeaderValueCell(plan.facultad, w4)
                    ]
                }),
                new TableRow({
                    children: [
                        this.createHeaderLabelCell("PERIODO ACADÉMICO", w1),
                        this.createHeaderValueCell(plan.periodoAcademico.toString(), w2),
                        this.createHeaderLabelCell("NOMBRE DECANO(A)", w3),
                        this.createHeaderValueCell(plan.decano, w4)
                    ]
                }),
                new TableRow({
                    children: [
                        this.createEmptyCell(w1),
                        this.createEmptyCell(w2),
                        this.createHeaderLabelCell("PROGRAMA", w3),
                        this.createHeaderValueCell(plan.programa, w4)
                    ]
                }),
                new TableRow({
                    children: [
                        this.createEmptyCell(w1),
                        this.createEmptyCell(w2),
                        this.createHeaderLabelCell("NOMBRE DIRECTOR(A)", w3),
                        this.createHeaderValueCell(plan.director, w4)
                    ]
                })
            ],
            borders: this.getNoBorders()
        });
    }

    private createHeaderLabelCell(text: string, widthPercent: number): TableCell {
        return new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: text, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })] })],
            shading: { fill: this.COLOR_HEADER_BG },
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 },
            borders: this.getSimpleBorders()
        });
    }

    private createHeaderLabelCellWithRowSpan(text: string, widthPercent: number, rowSpan: number): TableCell {
        return new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: text, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })] })],
            shading: { fill: this.COLOR_HEADER_BG },
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            rowSpan: rowSpan,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 },
            borders: this.getSimpleBorders()
        });
    }

    private createHeaderLabelCellWithSpan(text: string, widthPercent: number, columnSpan: number): TableCell {
        return new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: text, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })] })],
            shading: { fill: this.COLOR_HEADER_BG },
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            columnSpan: columnSpan,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 },
            borders: this.getSimpleBorders()
        });
    }

    private createHeaderValueCell(text: string, widthPercent: number): TableCell {
        return new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: text, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                alignment: AlignmentType.CENTER
            })],
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 },
            borders: this.getSimpleBorders()
        });
    }

    private createHeaderValueCellWithRowSpan(text: string, widthPercent: number, rowSpan: number): TableCell {
        return new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: text, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                alignment: AlignmentType.CENTER
            })],
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            rowSpan: rowSpan,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 },
            borders: this.getSimpleBorders()
        });
    }

    private createEmptyCell(widthPercent: number): TableCell {
        return new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: "", size: 1 })],
                spacing: { before: 0, after: 0, line: 0 }
            })],
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: this.getNoBorders()
        });
    }

    private crearTablaDatosProfesor(plan: PlanDeTrabajoCompleto, tituloPlan: string): Table {
        const campos = [
            { label: 'IDENTIFICACIÓN', value: plan.profesor.documento },
            { label: 'TIPO', value: 'C.C.' },
            { label: 'NOMBRES', value: plan.profesor.nombres },
            { label: 'APELLIDOS', value: plan.profesor.apellidos },
            { label: 'NIVEL DE FORMACIÓN', value: plan.profesor.formacion || 'No especificado' },
            { label: 'CATEGORÍA ESCALAFÓN', value: plan.profesor.escalafon || 'No especificado' },
            { label: 'TIPO DE DEDICACIÓN', value: plan.profesor.dedicacion === 'TIEMPO COMPLETO' ? 'TIEMPO COMPLETO' : 'MEDIO TIEMPO' },
            { label: 'TIPO DE VINCULACIÓN', value: plan.profesor.vinculacion || 'No especificado' }
        ];

        const rows = campos.map(campo =>
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: campo.label, bold: true, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })] })],
                        shading: { fill: this.COLOR_HEADER_BG },
                        width: { size: 22, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 80, bottom: 80, left: 113, right: 113 }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: campo.value, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })] })],
                        width: { size: 78, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 30, bottom: 30, left: 113, right: 113 }
                    })
                ]
            })
        );

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows,
            borders: this.getSimpleBorders()
        });
    }

    private renderizarTablaAsignaturas(asignaturas: AsignaturaData[]): Table {
        const headers = ['COD CURSO', 'GRUPO', 'SEM', 'NOMBRE DEL CURSO', 'ESTUD.', 'CRÉD.', 'HRS PRES.'];
        const widths = [10.34, 6.90, 6.32, 50.00, 9.20, 6.90, 10.34];

        const headerRow = new TableRow({
            children: headers.map((h, i) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: this.FONT_SIZE_TABLE, font: this.FONT_FAMILY })], alignment: AlignmentType.CENTER })],
                shading: { fill: this.COLOR_HEADER_BG },
                width: { size: widths[i], type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 113, right: 113 }
            }))
        });

        const dataRows = asignaturas.map((asig, idx) => {
            const bgColor = idx % 2 !== 0 ? this.COLOR_ROW_ALT : undefined;
            return new TableRow({
                children: [
                    this.createDataCell(asig.codAsignatura, widths[0], bgColor, true),
                    this.createDataCell(asig.grupo, widths[1], bgColor, true),
                    this.createDataCell(asig.semestre.toString(), widths[2], bgColor, true),
                    this.createDataCell(asig.nomAsignatura, widths[3], bgColor, false),
                    this.createDataCell(asig.numEstudiantes.toString(), widths[4], bgColor, true),
                    this.createDataCell(asig.numCreditos.toString(), widths[5], bgColor, true),
                    this.createDataCell(asig.horasPresenciales.toString(), widths[6], bgColor, true),
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
            borders: this.getSimpleBorders()
        });
    }

    private renderizarTablaInvestigaciones(investigaciones: InvestigacionData[]): Table {
        const headers = ['GRUPO INV.', 'COD', 'NOMBRE DEL PROYECTO', 'MOMENTO', 'PRODUCTOS ESPERADOS', 'HORAS'];
        const widths = [10.23, 7.95, 35.80, 10.23, 27.84, 7.95];

        const headerRow = new TableRow({
            children: headers.map((h, i) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: this.FONT_SIZE_TABLE, font: this.FONT_FAMILY })], alignment: AlignmentType.CENTER })],
                shading: { fill: this.COLOR_HEADER_BG },
                width: { size: widths[i], type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 113, right: 113 }
            }))
        });

        const dataRows = investigaciones.map((inv, idx) => {
            const bgColor = idx % 2 !== 0 ? this.COLOR_ROW_ALT : undefined;
            return new TableRow({
                children: [
                    this.createDataCell(inv.grupo || 'N/A', widths[0], bgColor, true),
                    this.createDataCell(inv.codigo, widths[1], bgColor, true),
                    this.createDataCell(inv.nombreProyecto, widths[2], bgColor, false),
                    this.createDataCell(inv.momento || 'N/A', widths[3], bgColor, true),
                    this.createDataCell(inv.productos, widths[4], bgColor, false),
                    this.createDataCell(inv.horas.toString(), widths[5], bgColor, true),
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
            borders: this.getSimpleBorders()
        });
    }

    private renderizarTablaActividades(actividades: ActividadData[]): Table {
        const headers = ['DENOMINACIÓN DE LA ACTIVIDAD', 'HORAS'];
        const widths = [88.51, 11.49];

        const headerRow = new TableRow({
            children: headers.map((h, i) => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: this.FONT_SIZE_TABLE, font: this.FONT_FAMILY })], alignment: i === 1 ? AlignmentType.CENTER : AlignmentType.LEFT })],
                shading: { fill: this.COLOR_HEADER_BG },
                width: { size: widths[i], type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 113, right: 113 }
            }))
        });

        const dataRows = actividades.map((act, idx) => {
            const bgColor = idx % 2 !== 0 ? this.COLOR_ROW_ALT : undefined;

            let nombreCompleto = act.nombre;
            if (act.asesorias && act.asesorias.length > 0) {
                const titulos = act.asesorias.map(a => a.titulo).join('\n');
                nombreCompleto += '\n' + titulos;
            }

            const partes = nombreCompleto.split('\n');
            const runs = partes.map((p, i) => new TextRun({
                text: p,
                size: this.FONT_SIZE_TABLE,
                font: this.FONT_FAMILY,
                break: i > 0 ? 1 : 0
            }));

            return new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: runs, alignment: AlignmentType.LEFT })],
                        shading: { fill: bgColor || 'FFFFFF' },
                        width: { size: widths[0], type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 80, bottom: 80, left: 113, right: 113 }
                    }),
                    this.createDataCell(act.horas.toString(), widths[1], bgColor, true),
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
            borders: this.getSimpleBorders()
        });
    }

    private crearSeccionFirmas(plan: PlanDeTrabajoCompleto): Table {
        const firmaTexto = [
            { titulo: 'Firma Profesor(a):', nombre: `${plan.profesor.nombres} ${plan.profesor.apellidos}` },
            { titulo: 'Firma Director(a):', nombre: plan.director },
            { titulo: 'Firma Decano(a):', nombre: plan.decano },
        ];

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: firmaTexto.map(f =>
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: f.titulo, bold: true, size: this.FONT_SIZE_NORMAL, font: this.FONT_FAMILY })],
                                    alignment: AlignmentType.LEFT,
                                    spacing: { after: 100 }
                                }),
                                new Paragraph({
                                    border: {
                                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" }
                                    },
                                    indent: { right: 110 },
                                    children: [new TextRun({ text: "", size: 1 })],
                                    spacing: { after: 300 }
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: f.nombre, size: this.FONT_SIZE_SMALL, font: this.FONT_FAMILY })],
                                    alignment: AlignmentType.LEFT
                                })
                            ],
                            width: { size: 32, type: WidthType.PERCENTAGE },
                            shading: { fill: 'F8F9FA' },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "C8C8C8" }
                            },
                            margins: { top: 50, bottom: 150, left: 113, right: 113 }
                        })
                    ).reduce((acc: TableCell[], curr, idx) => {
                        if (idx > 0) {
                            acc.push(new TableCell({
                                children: [],
                                width: { size: 2, type: WidthType.PERCENTAGE },
                                borders: this.getNoBorders()
                            }));
                        }
                        acc.push(curr);
                        return acc;
                    }, [])
                })
            ],
            borders: this.getNoBorders()
        });
    }

    private createDataCell(text: string, widthPercent: number, bgColor: string | undefined, center: boolean): TableCell {
        return new TableCell({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: text,
                            size: this.FONT_SIZE_TABLE,
                            font: this.FONT_FAMILY
                        })
                    ],
                    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT
                })
            ],
            shading: { fill: bgColor || 'FFFFFF' },
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 113, right: 113 }
        });
    }

    private getSimpleBorders() {
        const border = { style: BorderStyle.SINGLE, size: 2, color: "C8C8C8" };
        return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
    }

    private getNoBorders() {
        const none = { style: BorderStyle.NONE, size: 0 };
        return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    }
}
